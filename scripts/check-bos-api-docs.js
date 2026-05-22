#!/usr/bin/env node
/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file BOS API 文档变更检测脚本
 *
 * 工作流：
 *   1. 读取 docs/bos-api-doc-manifest.json 中的 doc URL 列表；
 *   2. 抓取每个文档页面，提取正文，计算 sha1 hash；
 *   3. 与 manifest 中存储的 docContentHash 对比：
 *        - hash 不存在：首次记录，写入 manifest（视为已对齐）；
 *        - hash 一致：未变更，跳过；
 *        - hash 不一致：标记 changed，输出 diff 摘要，更新 manifest（不修改 sdkAlignedAt）；
 *   4. 同步检查 src/bos_client.js 中的 @doc URL 是否在 manifest 中（防漏录）。
 *
 * CLI:
 *   node scripts/check-bos-api-docs.js                # 抓取并更新 manifest
 *   node scripts/check-bos-api-docs.js --check        # 仅检查，不写入；如有变更以非零退出
 *   node scripts/check-bos-api-docs.js --only listBuckets,getObject
 *   node scripts/check-bos-api-docs.js --scan-only    # 仅扫描源码，校验 manifest 完整性
 *   node scripts/check-bos-api-docs.js --sync         # 将源码新增的 @doc 自动补录到 manifest
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'bos-api-doc-manifest.json');
const SRC_PATH = path.join(ROOT, 'src', 'bos_client.js');

const args = process.argv.slice(2);
const FLAGS = {
  check: args.includes('--check'),
  scanOnly: args.includes('--scan-only'),
  sync: args.includes('--sync'),
  only: (() => {
    const idx = args.indexOf('--only');
    if (idx === -1) return null;
    return new Set((args[idx + 1] || '').split(',').filter(Boolean));
  })()
};

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'bce-sdk-js doc-checker/1.0',
            'Accept': 'text/html'
          }
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(fetchUrl(new URL(res.headers.location, url).toString()));
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
          let buf = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (buf += chunk));
          res.on('end', () => resolve(buf));
        }
      )
      .on('error', reject);
  });
}

/**
 * 从 HTML 中提取“正文”用于 hash 比对：
 *  - 去掉 <script>/<style>/<nav>/<header>/<footer>
 *  - 去掉所有 HTML 标签
 *  - 折叠空白
 *
 * 结果不一定语义完整，但足以稳定地作为「文档内容指纹」——
 * 每次小改动（如导航栏、样式）不会触发误报，正文增删则会被察觉。
 */
function extractBody(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function sha1(text) {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 扫源码 @doc URL，校验 manifest 是否覆盖所有声明的 URL。
 *
 * 规则：仅在 JSDoc 块关闭后（出现 `*\/`）的下一条非空、非注释语句是
 * `BosClient.prototype.X = ...` 时，才将该 @doc 认为是 X 的方法文档。
 * 否则视为文件级 / 函数级 JSDoc，丢弃。
 */
function scanSourceDocs() {
  const text = fs.readFileSync(SRC_PATH, 'utf8');
  const lines = text.split('\n');
  const docs = [];
  let pendingDoc = null; // {url} —— 一个已结束（*\/）但未消费的 @doc
  let inDocBlock = false;
  let currentBlockDoc = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inDocBlock && trimmed.startsWith('/**')) {
      inDocBlock = true;
      currentBlockDoc = null;
      if (trimmed.endsWith('*/')) {
        inDocBlock = false;
        if (currentBlockDoc) pendingDoc = {url: currentBlockDoc};
        currentBlockDoc = null;
      }
      continue;
    }
    if (inDocBlock) {
      const dm = line.match(/@doc\s+(https?:\/\/\S+)/);
      if (dm) currentBlockDoc = dm[1];
      if (trimmed.endsWith('*/')) {
        inDocBlock = false;
        if (currentBlockDoc) pendingDoc = {url: currentBlockDoc};
        currentBlockDoc = null;
      }
      continue;
    }

    // JSDoc block 已关闭。下一条非空非注释语句决定 pendingDoc 归属。
    if (!trimmed || trimmed.startsWith('//')) continue;

    const pm = trimmed.match(/^BosClient\.prototype\.(\w+)\s*=/);
    if (pm && pendingDoc) {
      docs.push({method: pm[1], url: pendingDoc.url, line: i + 1});
    }
    pendingDoc = null;
  }
  return docs;
}

async function main() {
  const manifest = readManifest();

  // ---------- Step 1: 源码 -> manifest 完整性校验 ----------
  const sourceDocs = scanSourceDocs();
  const manifestUrls = new Set(Object.values(manifest.apis).map((v) => v.doc));
  const missingInManifest = sourceDocs.filter((d) => !manifestUrls.has(d.url));
  if (missingInManifest.length) {
    console.warn('\n[WARN] 以下 @doc URL 出现在源码但未录入 manifest：');
    for (const d of missingInManifest) {
      console.warn(`  - BosClient.${d.method}  ${d.url}  (bos_client.js:${d.line})`);
    }
  }

  // ---------- Step 1.5: --sync 自动补录缺失条目 ----------
  if (FLAGS.sync && missingInManifest.length) {
    for (const d of missingInManifest) {
      const apiKey = `BosClient.${d.method}`;
      if (manifest.apis[apiKey]) continue; // 同名不同 URL，需人工处理
      manifest.apis[apiKey] = {
        doc: d.url,
        docContentHash: null,
        docCheckedAt: null,
        sdkAlignedAt: today(),
        notes: ''
      };
      console.log(`[SYNC] 已新增 ${apiKey} -> ${d.url}`);
    }
    // 按 key 字母序重排
    manifest.apis = Object.fromEntries(
      Object.entries(manifest.apis).sort(([a], [b]) => a.localeCompare(b))
    );
    writeManifest(manifest);
    console.log(
      `\n已写回 ${path.relative(ROOT, MANIFEST_PATH)}。` +
        '下一步：运行 `node scripts/check-bos-api-docs.js --only <method>` 拉取 hash 基线。'
    );
    process.exit(0);
  }

  if (FLAGS.scanOnly) {
    if (missingInManifest.length) {
      console.error(`\n[FAIL] 源码中有 ${missingInManifest.length} 个 @doc 未登记到 manifest。`);
      process.exit(1);
    }
    console.log(
      `[OK] 源码 @doc 全部已登记 (${sourceDocs.length} 条方法级 @doc，` +
        `manifest 共 ${Object.keys(manifest.apis).length} 个 API)。`
    );
    process.exit(0);
  }

  // ---------- Step 2: 抓取 + hash 对比 ----------
  const entries = Object.entries(manifest.apis).filter(([api]) => {
    if (!FLAGS.only) return true;
    const short = api.replace(/^BosClient\./, '');
    return FLAGS.only.has(short) || FLAGS.only.has(api);
  });

  const results = {unchanged: [], firstSeen: [], changed: [], failed: []};

  for (const [api, entry] of entries) {
    process.stdout.write(`→ ${api} ... `);
    try {
      const html = await fetchUrl(entry.doc);
      const body = extractBody(html);
      const hash = sha1(body);
      const prev = entry.docContentHash;

      if (!prev) {
        results.firstSeen.push({api, hash});
        entry.docContentHash = hash;
        entry.docCheckedAt = today();
        console.log('first-seen');
      } else if (prev === hash) {
        results.unchanged.push(api);
        entry.docCheckedAt = today();
        console.log('unchanged');
      } else {
        results.changed.push({api, prev, next: hash, doc: entry.doc});
        entry.docContentHash = hash;
        entry.docCheckedAt = today();
        console.log('CHANGED');
      }
    } catch (err) {
      results.failed.push({api, error: err.message});
      console.log(`FAILED (${err.message})`);
    }
  }

  // ---------- Step 3: 输出报告 + 写回 ----------
  console.log('\n========== 检查报告 ==========');
  console.log(`未变更:   ${results.unchanged.length}`);
  console.log(`首次记录: ${results.firstSeen.length}`);
  console.log(`已变更:   ${results.changed.length}`);
  console.log(`失败:     ${results.failed.length}`);

  if (results.changed.length) {
    console.log('\n[变更明细] 需要复核 SDK 类型/JSDoc 是否与文档对齐：');
    for (const c of results.changed) {
      console.log(`  - ${c.api}`);
      console.log(`      doc:   ${c.doc}`);
      console.log(`      prev:  ${c.prev}`);
      console.log(`      next:  ${c.next}`);
    }
  }

  if (results.failed.length) {
    console.log('\n[抓取失败]');
    for (const f of results.failed) console.log(`  - ${f.api}: ${f.error}`);
  }

  if (FLAGS.check) {
    const dirty = results.changed.length > 0 || missingInManifest.length > 0;
    process.exit(dirty ? 1 : 0);
  }

  writeManifest(manifest);
  console.log(`\n已写回 ${path.relative(ROOT, MANIFEST_PATH)}`);

  if (results.changed.length) {
    console.log(
      '\n下一步建议：将「变更明细」中的 API 列表反馈给 Comate / 人工，' +
        '抓取最新文档后比对 SDK 类型并更新 sdkAlignedAt。'
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

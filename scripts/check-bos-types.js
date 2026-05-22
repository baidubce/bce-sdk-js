#!/usr/bin/env node
/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file BosClient `@type` 注解 <-> bos-client.d.ts 一致性检查 / 同步工具
 *
 * 设计原则：
 *   - `types/bos-client.d.ts` 是 source of truth（类型 / 重载 / 描述全部在 d.ts 维护）
 *   - `src/bos_client.js` 中每个公开的 `BosClient.prototype.X = function (...)` 必须带有
 *     `/** @type {IBosClient['X']} *\/` 单行注解；TS 通过 `// @ts-check` 直接做参数与
 *     返回值检查，无需在 JSDoc 中重复声明 @param/@returns/描述。
 *   - 链式赋值（如 `BosClient.prototype.putBucket = BosClient.prototype.createBucket = function`）
 *     的注解绑定到链头方法即可。
 *
 * CLI:
 *   node scripts/check-bos-types.js --scan    # 仅扫描列出差异
 *   node scripts/check-bos-types.js --check   # 严格检查；存在差异以非零退出
 *   node scripts/check-bos-types.js --strict  # 仅检查 .js 中存在但 d.ts 缺失的方法（CI/prebuild）
 *   node scripts/check-bos-types.js --sync    # 自动修复：补齐 / 修正 .js 的 @type 注解 + 为 d.ts 缺失方法追加 stub
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const DTS_PATH = path.join(ROOT, 'types', 'bos-client.d.ts');
const JS_PATH = path.join(ROOT, 'src', 'bos_client.js');

const argv = process.argv.slice(2);
const FLAGS = {
    scan: argv.includes('--scan'),
    sync: argv.includes('--sync'),
    check: argv.includes('--check'),
    strict: argv.includes('--strict')
};
if (!FLAGS.scan && !FLAGS.sync && !FLAGS.check && !FLAGS.strict) FLAGS.check = true;

/* ============================================================================
 * 通用工具
 * ============================================================================ */

function readSource(file) {
    const text = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    return {text, sf};
}

function getLeadingJSDoc(node, sourceText) {
    const ranges = ts.getLeadingCommentRanges(sourceText, node.pos) || [];
    for (let i = ranges.length - 1; i >= 0; i--) {
        const r = ranges[i];
        if (r.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
            const text = sourceText.slice(r.pos, r.end);
            if (text.startsWith('/**')) return {text, range: r};
        }
    }
    return null;
}

/**
 * 从 JSDoc 注释中解析 `@type {IBosClient['key']}`。
 * 仅识别 IBosClient（或 BosClient）名下的索引访问形式；其他形式视为「无注解」。
 *
 * @param {string} blockText
 * @returns {string | null} 方括号中的 key（去掉引号）；未匹配返回 null
 */
function parseTypeAnnotation(blockText) {
    if (!blockText) return null;
    const m = blockText.match(/@type\s*\{\s*I?BosClient\s*\[\s*['"]([\w$]+)['"]\s*\]\s*\}/);
    return m ? m[1] : null;
}

/* ============================================================================
 * .d.ts 提取（BosClient class members）
 * ============================================================================ */

function extractDtsMethods() {
    const {sf} = readSource(DTS_PATH);
    const methods = [];

    function visit(node) {
        if (
            (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node))
            && node.name
            && node.name.text === 'BosClient'
        ) {
            for (const member of node.members) {
                if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
                    const name = member.name && member.name.getText();
                    if (!name) continue;
                    if (name.startsWith('_')) continue;
                    methods.push({name});
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sf);
    return methods;
}

/* ============================================================================
 * .js 提取（BosClient.prototype.X = function(...) {...}）
 * ============================================================================ */

function extractJsMethods() {
    const {text, sf} = readSource(JS_PATH);
    const methods = [];

    function collectChainedTargets(expr) {
        const targets = [];
        let cur = expr;
        while (
            ts.isBinaryExpression(cur)
            && cur.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
            const left = cur.left;
            if (
                ts.isPropertyAccessExpression(left)
                && ts.isPropertyAccessExpression(left.expression)
                && left.expression.expression.getText() === 'BosClient'
                && left.expression.name.text === 'prototype'
            ) {
                targets.push(left.name.text);
            }
            cur = cur.right;
        }
        return {names: targets, finalRhs: cur};
    }

    function visit(node) {
        if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
            const {names, finalRhs} = collectChainedTargets(node.expression);
            if (
                names.length > 0
                && (ts.isFunctionExpression(finalRhs) || ts.isArrowFunction(finalRhs))
            ) {
                const jsdoc = getLeadingJSDoc(node, text);
                const annotationKey = jsdoc ? parseTypeAnnotation(jsdoc.text) : null;
                const headName = names[0];
                methods.push({
                    name: headName,
                    aliases: names.slice(1),
                    stmtStart: node.getStart(),
                    jsdocRange: jsdoc && jsdoc.range,
                    jsdocText: jsdoc && jsdoc.text,
                    annotationKey
                });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sf);
    return methods.filter((m) => !m.name.startsWith('_'));
}

/* ============================================================================
 * 差异计算
 * ============================================================================ */

function computeDiff(dtsMethods, jsMethods) {
    const dtsSet = new Set(dtsMethods.map((m) => m.name));
    const jsHeadSet = new Set(jsMethods.map((m) => m.name));
    const jsAllImplemented = new Set();
    for (const m of jsMethods) {
        jsAllImplemented.add(m.name);
        for (const a of m.aliases) jsAllImplemented.add(a);
    }

    const onlyJs = [...jsHeadSet].filter((n) => !dtsSet.has(n)).sort();
    const onlyDts = [...dtsSet].filter((n) => !jsAllImplemented.has(n)).sort();

    const issues = [];
    for (const jsM of jsMethods) {
        if (!dtsSet.has(jsM.name)) continue;
        if (!jsM.annotationKey) {
            issues.push({type: 'missing_type_annotation', name: jsM.name});
        } else if (jsM.annotationKey !== jsM.name) {
            issues.push({
                type: 'mismatched_type_annotation',
                name: jsM.name,
                annotationKey: jsM.annotationKey
            });
        }
    }
    return {onlyJs, onlyDts, issues};
}

/* ============================================================================
 * 报告输出
 * ============================================================================ */

function reportDiff(diff) {
    const {onlyJs, onlyDts, issues} = diff;
    const total = onlyJs.length + onlyDts.length + issues.length;

    if (onlyJs.length) {
        console.log('\n[ONLY-IN-JS] 源码定义但 d.ts 缺失：');
        for (const n of onlyJs) console.log(`  - BosClient.${n}`);
    }
    if (onlyDts.length) {
        console.log('\n[ONLY-IN-DTS] d.ts 声明但源码未实现（疑似遗留）：');
        for (const n of onlyDts) console.log(`  - BosClient.${n}`);
    }

    const byType = {};
    for (const i of issues) (byType[i.type] = byType[i.type] || []).push(i);

    if (byType.missing_type_annotation) {
        console.log('\n[MISSING_TYPE] 缺少 `/** @type {IBosClient[\'X\']} */` 注解：');
        for (const i of byType.missing_type_annotation) console.log(`  - ${i.name}`);
    }
    if (byType.mismatched_type_annotation) {
        console.log('\n[MISMATCHED_TYPE] @type 注解中的方法名与 LHS 不一致：');
        for (const i of byType.mismatched_type_annotation) {
            console.log(`  - ${i.name}: annotation="${i.annotationKey}"`);
        }
    }

    console.log('\n========== 一致性报告 ==========');
    console.log(`  仅在 .js  : ${onlyJs.length}`);
    console.log(`  仅在 .d.ts: ${onlyDts.length}`);
    console.log(`  注解差异  : ${issues.length}`);
    console.log(`  合计需关注: ${total}`);
    return total;
}

/* ============================================================================
 * 同步：改写 .js JSDoc + 为 d.ts 追加 stub
 * ============================================================================ */

function applySync(dtsMethods, jsMethods) {
    const dtsSet = new Set(dtsMethods.map((m) => m.name));

    // ----- 1. 改写 .js JSDoc 为单行 @type 注解 -----
    const jsText = fs.readFileSync(JS_PATH, 'utf8');
    const replacements = [];
    let rewriteCount = 0;
    for (const jsM of jsMethods) {
        if (!dtsSet.has(jsM.name)) continue;
        if (jsM.annotationKey === jsM.name) continue;

        const expectedBlock = `/** @type {IBosClient['${jsM.name}']} */`;

        if (jsM.jsdocRange) {
            replacements.push({
                start: jsM.jsdocRange.pos,
                end: jsM.jsdocRange.end,
                text: expectedBlock
            });
        } else {
            const stmtStart = jsM.stmtStart;
            const lineStart = jsText.lastIndexOf('\n', stmtStart - 1) + 1;
            const indent = jsText.slice(lineStart, stmtStart);
            replacements.push({
                start: stmtStart,
                end: stmtStart,
                text: `${expectedBlock}\n${indent}`
            });
        }
        rewriteCount++;
    }
    replacements.sort((a, b) => b.start - a.start);
    let newJsText = jsText;
    for (const r of replacements) {
        newJsText = newJsText.slice(0, r.start) + r.text + newJsText.slice(r.end);
    }
    if (newJsText !== jsText) {
        fs.writeFileSync(JS_PATH, newJsText, 'utf8');
        console.log(`[SYNC] 已改写 ${rewriteCount} 处 .js @type 注解`);
    }

    // ----- 2. 为 d.ts 追加缺失方法的 stub -----
    const missingInDts = jsMethods.filter((m) => !dtsSet.has(m.name));
    if (missingInDts.length) {
        const dtsText = fs.readFileSync(DTS_PATH, 'utf8');
        const sf = ts.createSourceFile(DTS_PATH, dtsText, ts.ScriptTarget.Latest, true);
        let bosClassEnd = -1;
        function find(n) {
            if (
                (ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n))
                && n.name && n.name.text === 'BosClient'
            ) {
                bosClassEnd = n.end - 1;
            }
            ts.forEachChild(n, find);
        }
        find(sf);

        if (bosClassEnd > 0) {
            const stubs = [];
            for (const m of missingInDts) {
                stubs.push(
                    `\n        /** TODO: 待人工细化类型（由 check-bos-types --sync 自动生成） */\n`
                    + `        ${m.name}(...args: any[]): BosResponse;\n`
                );
                console.log(`[STUB] d.ts 已追加 BosClient.${m.name}`);
            }
            const newDtsText =
                dtsText.slice(0, bosClassEnd) + stubs.join('') + dtsText.slice(bosClassEnd);
            fs.writeFileSync(DTS_PATH, newDtsText, 'utf8');
        }
    }

    if (rewriteCount === 0 && missingInDts.length === 0) {
        console.log('[SYNC] 无需修改，所有内容已对齐。');
    }
}

/* ============================================================================
 * main
 * ============================================================================ */

function main() {
    const dtsMethods = extractDtsMethods();
    const jsMethods = extractJsMethods();
    const diff = computeDiff(dtsMethods, jsMethods);

    if (FLAGS.sync) {
        applySync(dtsMethods, jsMethods);
        const dtsAgain = extractDtsMethods();
        const jsAgain = extractJsMethods();
        const diffAfter = computeDiff(dtsAgain, jsAgain);
        const remaining = reportDiff(diffAfter);
        if (remaining > 0) {
            console.log(
                '\n[NOTE] 上方残留差异多为 d.ts 端类型/重载语义，需人工确认；'
                + '若是新增方法的 stub，请人工细化类型。'
            );
        }
        process.exit(0);
    }

    const total = reportDiff(diff);

    if (FLAGS.scan) {
        process.exit(0);
    }

    if (FLAGS.strict) {
        if (diff.onlyJs.length > 0) {
            console.log(
                '\n[FAIL] 源码新增的方法在 d.ts 中尚未声明，无法通过构建检查。'
                + '\n  解决方式：运行 `npm run types:sync` 自动追加 stub，再人工细化类型。'
            );
            process.exit(1);
        }
        const missingAnno = diff.issues.filter((i) => i.type === 'missing_type_annotation');
        if (missingAnno.length) {
            console.log(
                `\n[WARN] 存在 ${missingAnno.length} 处方法缺少 @type 注解，`
                + '建议运行 `npm run types:sync` 修复。'
            );
        }
        console.log('\n[OK] 所有源码方法均已在 d.ts 中声明，可以进入构建。');
        process.exit(0);
    }

    if (total > 0) {
        console.log(
            '\n[FAIL] 检测到 d.ts 与 .js @type 注解不一致。'
            + '运行 `npm run types:sync` 自动修复（或人工对齐后再次校验）。'
        );
        process.exit(1);
    }
    console.log('[OK] BosClient @type 注解与 d.ts 完全对齐。');
    process.exit(0);
}

main();

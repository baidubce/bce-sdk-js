# Baidu Cloud Engine JavaScript SDK

[![Build Status](https://travis-ci.org/baidubce/bce-sdk-js.svg?branch=master)](https://travis-ci.org/baidubce/bce-sdk-js)
[![NPM version](https://img.shields.io/npm/v/@baiducloud/sdk.svg?style=flat)](https://www.npmjs.com/package/@baiducloud/sdk)
[![Coverage Status](https://coveralls.io/repos/github/baidubce/bce-sdk-js/badge.svg?branch=master)](https://coveralls.io/github/baidubce/bce-sdk-js?branch=master)

文档地址：<https://baidubce.github.io/bce-sdk-js/>

## 通过 NPM 安装

```shell
npm install @baiducloud/sdk
```

## 通过 CDN 引用

`${version}`处使用版本号替换，比如`1.0.0-rc.37`

```html
<script src="https://bce.bdstatic.com/lib/@baiducloud/sdk/${version}/baidubce-sdk.bundle.min.js"></script>
```

## 发布

```bash
# 检查已发布版本号
npm view @baiducloud/sdk versions

# 更新版本号
# <version> -- 指定的版本号
npm version <version> --git-tag-version false

# 编译（注意：pack指令已废弃）
npm run build

git add -u .
git commit -m "bump: <version>"

# 发布测试版本
npm publish --tag beta --registry=https://registry.npmjs.org
# 发布正式版本
npm publish --registry=https://registry.npmjs.org

# 发布到CDN
npm run publish:bos
```

## API 文档同步

为保持 SDK 类型声明与百度云官方 API 文档对齐，项目维护了一份 API 文档清单（`docs/bos-api-doc-manifest.json`），并提供脚本 `scripts/check-bos-api-docs.js` 自动检测官方文档变更。

### 清单结构

`docs/bos-api-doc-manifest.json` 中每个 API 对应一条记录：

```json
{
  "BosClient.listBuckets": {
    "doc": "https://cloud.baidu.com/doc/BOS/s/bkcacfjvi",
    "docContentHash": "<sha1>",
    "docCheckedAt": "2026-05-19",
    "sdkAlignedAt": "2026-05-19",
    "notes": "说明信息（可选）"
  }
}
```

字段含义：

- `doc`：官方文档 URL。
- `docContentHash`：文档正文（剥离脚本/样式/导航后）的 sha1，用作变更指纹。
- `docCheckedAt`：上一次拉取检查的日期。
- `sdkAlignedAt`：SDK 类型/JSDoc 与文档对齐时的日期；只有人工核对后才更新。
- `notes`：备注 SDK 特有扩展、限制等。

### 命令

```bash
# 拉取所有官方文档，更新 hash 与 docCheckedAt（首次运行用于 bootstrap）
npm run docs:update

# 只检测变更，不写入；存在变更或缺漏时退出码非 0（适合 CI）
npm run docs:check

# 扫描源码 @doc 注解，确认所有 API 都已在清单中登记
npm run docs:scan

# 自动将源码新增、但未录入清单的 @doc 补全到 manifest（hash 留空，再用 docs:update 拉取基线）
npm run docs:sync
```

### 工作流

1. **新增 API**：在 `src/bos_client.js` 的 JSDoc 中追加 `@doc <官方文档URL>`，然后运行 `npm run docs:sync` 自动把新增条目写入 `docs/bos-api-doc-manifest.json`（`docContentHash` 暂为 `null`，`sdkAlignedAt` 取当前日期）。再运行 `npm run docs:scan` 校验清单完整性。
2. **首次入库 / 周期巡检**：执行 `npm run docs:update`，脚本会拉取所有 URL、计算 hash 并写回清单。首次运行将 `docs:sync` 留下的 `null` 填充为基准值。
3. **检测变更**：在 CI 或本地执行 `npm run docs:check`。若官方文档内容变化，脚本输出 `CHANGED` 列表并以非零状态退出。
4. **处理变更**：人工对比文档差异，更新 `types/bos-client.d.ts` 的接口字段及 `src/bos_client.js` 的 JSDoc，使其与文档保持一致；随后运行 `npm run docs:update` 刷新 hash，并将该 API 的 `sdkAlignedAt` 更新为当前日期。
5. **退出码**：`0`（一致或已 bootstrap）、`1`（`--check` 检测到变更或缺漏）、`2`（网络错误）。


## JSDoc ↔ d.ts 一致性检查

`src/bos_client.js` 的 JSDoc 与 `types/bos-client.d.ts` 之间通过脚本 `scripts/check-bos-types.js` 自动校验。设计原则：

- **d.ts 是 source of truth**：类型/重载/泛型表达力更强，由其决定方法集合、形参名和首段描述
- **.js JSDoc 跟随 d.ts**：仅同步「描述」与「@param 形参名」，其他标签（`@doc` / `@platform` / `@remarks` / `@returns` 类型注解）原样保留

### 命令

```bash
# 列出所有差异（仅在 .js / 仅在 .d.ts / 形参数量 / 形参名 / 描述 / 缺失 @returns）
npm run types:scan

# 全量严格检查（任何差异退出码 1，适合人工对齐）
npm run types:check

# 构建前关卡：仅当源码新增方法在 d.ts 中尚未声明时阻塞构建
npm run types:strict

# 自动同步：用 d.ts 改写 .js 的描述/形参名，并为 .js 中新增方法在 d.ts 追加 stub
npm run types:sync
```

### 工作流

1. 在 `src/bos_client.js` 新增/修改方法后，先在 `types/bos-client.d.ts` 写好类型签名
2. 执行 `npm run types:sync`，脚本会用 d.ts 的描述与形参名覆写 JSDoc；若 d.ts 中尚未声明，会自动追加 `TODO` stub
3. 若有 stub，人工细化类型后再次执行 `npm run types:scan` 复查
4. `npm run build` 会自动前置执行 `types:strict + docs:check`，结构性差异（仅在 .js 的方法）会阻塞构建


## TS 声明

SDK 自带 TypeScript 类型声明（入口为 `types/index.d.ts`，已在 `package.json` 的 `types` 字段中注册），所有公开类型统一收敛在 `BaiduBCE` 命名空间下。下面给出不同环境下获取类型与值的推荐方式。

### Node.js / 打包器（推荐）

CommonJS：

```ts
import SDK = require('@baiducloud/sdk');

const bos = new SDK.BosClient({
    endpoint: 'https://bj.bcebos.com',
    credentials: {ak: 'xxx', sk: 'yyy'},
});

// 仅取类型
type BosClient = SDK.BosClient;
type Owner = SDK.Owner;
```

ES Module / `esModuleInterop: true`：

```ts
import SDK, {BosClient, crypto} from '@baiducloud/sdk';
import type {Owner, ListBucketsRes} from '@baiducloud/sdk';

const bos = new BosClient({/* ... */});
```

> 说明：SDK 运行时是 CommonJS，类型声明则使用 `export = BaiduBCE`。开启 `esModuleInterop` 后两种写法都可用；未开启时优先使用 `import = require` 形式。

### 浏览器 / CDN 全局变量

通过 `<script>` 引入后，全局会注入 `baidubce.sdk`，类型声明已为其补充全局类型：

```ts
// 直接全局访问
const bos = new baidubce.sdk.BosClient({/* ... */});

// 通过 window 访问
const cfc = new window.baidubce.sdk.CFCClient({/* ... */});

// 仅取类型（无需 import）
type Bos = baidubce.sdk.BosClient;
```

无需任何 `import` 即可获得提示。如果项目里同时通过 npm 引入了 SDK，全局声明与模块声明指向同一份命名空间，不会冲突。

### 跨环境 API 提示

部分方法仅在某一环境可用，类型声明已通过 JSDoc `@platform` 标注：

- `@platform Node.js`：如 `putObjectFromFile`、`getObjectToFile`，依赖 Node 的 `fs` / `stream`。
- `@platform Browser`：如 `putObjectFromBlob`、`putObjectFromDataUrl`，依赖浏览器 `Blob` / `File`。
- `@platform Node.js | Browser`：如 `putObjectFromString`，两端通用。

IDE hover 时会展示 `@platform` 与 `@remarks`（指向另一环境的等价方法），编写跨环境代码时请优先选择通用方法。

### 常见问题

- **类型推断为 `any`**：通常是消费方未安装 `@types/node`。SDK 已将其声明为 `dependencies`，正常 `npm install` 即可。手动安装：`npm i -D @types/node`。
- **`Cannot find module 'node:fs'`**：SDK 内部统一使用不带 `node:` 前缀的模块名（如 `'fs'`、`'http'`、`'crypto'`），兼容 `moduleResolution: node`（classic）/ `node16` / `nodenext` / `bundler` 各种解析策略。如果你在自己的代码中使用 `node:` 前缀报错，请将 tsconfig `moduleResolution` 调整为 `node16` 或更新版本。


/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file index.d.ts
 *
 * --------------------------------------------------------------------------
 * 本目录下 .d.ts 文件的硬约定（新增/修改前请先读完）：
 *
 * 1. 所有「业务声明」统一挂在 `declare namespace BaiduBCE { ... }` 下，
 *    依靠 namespace merging 跨文件合并。新文件务必沿用这个 namespace 名。
 *
 * 2. 文件顶层禁止使用 ES module 形式的 import / export：
 *      // ❌ 禁止：会把整个 .d.ts 升格成 module，破坏 namespace merging
 *      import type {ReadStream} from 'node:fs';
 *      // ❌ 禁止：在 declare namespace 内部使用 ES import，名字会被静默当成 any
 *      declare namespace BaiduBCE { import {X} from 'pkg'; }
 *
 *    引用 Node / DOM 内置类型时，统一使用 inline import-type 语法：
 *      // ✅ 推荐
 *      type Foo = import('fs').ReadStream;
 *      function bar(s: import('crypto').BinaryToTextEncoding): void;
 *
 *    ⚠️ 模块名不要带 `node:` 前缀。`node:` 前缀仅在 TS
 *    `moduleResolution: node16 | nodenext | bundler` 下才会被识别；
 *    消费方若使用默认的 `moduleResolution: node` (classic)，会把 `node:fs`
 *    当作 URI 直接跳过，导致类型静默回退为 `any`。统一写 `'fs'` / `'http'`
 *    / `'crypto'` 等不带前缀的形式，可在所有解析模式下正确指向 @types/node。
 *
 * 3. 文件命名与 src/ 源码一一对应（如 src/sts.js ↔ types/sts.d.ts），
 *    新增文件后记得在本入口文件 `import './<file>';` 显式拉入，否则消费方解析不到。
 *
 * 4. 跨环境敏感的方法（仅 Node.js / 仅 Browser 可用）以 JSDoc 标注 @platform，
 *    并用 @remarks 指向另一环境的等价方法，便于 IDE hover 提示。
 * --------------------------------------------------------------------------
 */

import './base';
import './http-client';
import './bce-base-client';
import './bos-client';
import './cfc-client';
import './sts';
import './auth';
import './base64';
import './mime.types';
import './crypto';
import './legacy-exports';

export = BaiduBCE;

/**
 * CDN 模式下浏览器全局对象 `window.baidubce.sdk` 暴露的类型，
 * 直接对齐 `BaiduBCE` 命名空间的运行时形态，新增成员无需手工同步这里。
 */
type SDKGlobal = typeof BaiduBCE;

declare global {
    /** 直接以全局变量访问：`baidubce.sdk.BosClient` */
    const baidubce: {sdk: SDKGlobal};

    /** 通过 `window.baidubce.sdk.BosClient` 访问（CDN 引入场景） */
    interface Window {
        baidubce: {sdk: SDKGlobal};
    }
}

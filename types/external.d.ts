/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file external.d.ts
 * @description 为未提供 @types 包的第三方依赖补一份 ambient 声明，
 *              让 `// @ts-check` / strict 模式下的 require 不再报 TS7016。
 *              这里只声明存在性，具体形态保持 any，避免与运行时实现脱节。
 */

declare module 'underscore';
declare module 'q';
declare module 'debug';

/**
 * 补齐 `fs.ReadStream` 的运行时字段。
 *
 * Node 在 `fs.createReadStream(path, {start, end})` 内部会把 `start` / `end`
 * 挂到实例上（见 `lib/internal/fs/streams.js` 中的 `ReadStream` 构造），
 * 但 `@types/node` 未公开声明这两个属性。本文件以声明合并方式补齐，
 * 让业务代码可以直接读 `stream.start` / `stream.end`，无需 `any` 转型。
 */
declare module 'fs' {
    interface ReadStream {
        /** 读取起始字节偏移；由 `fs.createReadStream` options 透传 */
        start?: number;
        /** 读取结束字节偏移（含）；由 `fs.createReadStream` options 透传 */
        end?: number;
    }
}


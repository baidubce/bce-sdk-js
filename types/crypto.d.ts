/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file crypto.d.ts
 * @module src/crypto.js
 * @description
 * 对应源码 src/crypto.js。在 index.js 中以 `exports.crypto = require('./src/crypto')`
 * 整体挂载，运行时形态是 namespace（一组顶层函数）。
 */

/// <reference path="base.d.ts" />

declare namespace BaiduBCE {
    namespace crypto {
        /** 默认的 digest 摘要编码（`hex` / `base64` / `base64url`） */
        type Md5Digest = import('crypto').BinaryToTextEncoding;

        /**
         * 计算字符串或 Buffer 的 MD5。
         *
         * @platform Node.js
         * @param data    待计算的内容
         * @param enc     当 `data` 为字符串时使用的编码，默认为 `'UTF-8'`
         * @param digest  摘要编码，默认为 `'base64'`
         */
        function md5sum(
            data: string | Buffer,
            enc?: BufferEncoding | null,
            digest?: Md5Digest
        ): string;

        /**
         * 流式计算 MD5。
         *
         * @platform Node.js
         * @param stream  可读流
         * @param digest  摘要编码，默认为 `'base64'`
         */
        function md5stream(
            stream: import('fs').ReadStream,
            digest?: Md5Digest
        ): Promise<string>;

        /**
         * 计算文件 MD5（内部转为流式）。
         *
         * @platform Node.js
         * @param filename 文件路径
         * @param digest   摘要编码，默认为 `'base64'`
         */
        function md5file(filename: string, digest?: Md5Digest): Promise<string>;

        /**
         * 计算 Blob 的 MD5（基于 `FileReader`）。
         *
         * @platform Browser
         * @param blob    浏览器 Blob / File 对象
         * @param digest  摘要编码，默认为 `'base64'`
         */
        function md5blob(blob: Blob, digest?: Md5Digest): Promise<string>;
    }
}

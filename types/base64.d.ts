/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file base64.d.ts
 * @module src/base64.js
 * @description URL-safe Base64 编解码工具，跨 Node.js / Browser 双端可用。
 */

/// <reference path="base.d.ts" />

declare namespace BaiduBCE {
    /**
     * `Base64` 在 `index.js` 中以 `exports.Base64 = require('./src/base64')` 整体挂出，
     * 因此运行时形态是一个对象，而非 class。
     */
    namespace Base64 {
        /**
         * URL-safe Base64 编码。会自动剥离 `=` 填充并将 `+` / `/` 替换为 `-` / `_`。
         *
         * @platform Node.js | Browser
         * @param inputStr 字符串或可被 `JSON.stringify` 序列化的对象
         */
        function urlEncode(inputStr: string | Record<string, any>): string;

        /**
         * URL-safe Base64 解码。
         *
         * @platform Node.js | Browser
         * @param inputStr 编码后的字符串
         */
        function urlDecode(inputStr: string): string;
    }
}

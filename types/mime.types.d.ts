/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file mime.types.d.ts
 * @module src/mime.types.js
 * @description 文件扩展名到 MIME 类型的映射工具。
 */

declare namespace BaiduBCE {
    /**
     * Mime Type 工具
     */
    namespace MimeType {
        const mimeTypes: Record<string, string>;
        const guess: (ext: string) => string;
    }
}

/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file auth.d.ts
 * @module src/auth.js
 * @description BCE 鉴权签名工具，目前仅支持v1版本认证字符串
 * @doc https://cloud.baidu.com/doc/Reference/s/Njwvz1wot
 */

/// <reference path="base.d.ts" />

declare namespace BaiduBCE {
    /**
     * 待签名的请求头列表，未传入时默认使用 `[Host, Content-MD5, Content-Length, Content-Type]`。
     */
    type AuthHeadersToSign = ReadonlyArray<string>;

    /** `headersCanonicalization` 返回的元组：`[canonicalHeaders, signedHeaderNames]` */
    type CanonicalHeadersResult = [string, string[]];

    /**
     * 签名工具。
     * 一般通过 `HttpClient` / `BceBaseClient` 间接使用，需要自行计算签名时可直接实例化。
     */
    class Auth {
        /**
         * @param ak 百度云账户体系 `Access Key`
         * @param sk 百度云账户体系 `Secret Access Key`
         */
        constructor(ak: string, sk: string);

        ak: string;
        sk: string;

        /**
         * 计算 BCE V1 签名。
         *
         * @doc https://cloud.baidu.com/doc/Reference/s/njwvz1yfu
         *
         * @param method               HTTP 方法，如 `GET` / `POST`
         * @param resource             请求路径（不含 query）
         * @param params               URL 查询参数
         * @param headers              请求头
         * @param timestamp            指定时间戳（秒），默认使用当前时间
         * @param expirationInSeconds  签名有效期（秒），默认 1800
         * @param headersToSign        参与签名的 header 列表
         * @returns 计算好的 `Authorization` 头值
         */
        generateAuthorization(
            method: string,
            resource: string,
            params?: Record<string, any>,
            headers?: Record<string, any>,
            timestamp?: number | Date,
            expirationInSeconds?: number,
            headersToSign?: AuthHeadersToSign
        ): string;

        /** 对 URI 做规范化（默认透传，仅在 `bos-share.baidubce.com` 域名下做编码） */
        uriCanonicalization(uri: string): string;

        /** 拼接规范化的 query string */
        queryStringCanonicalization(params: Record<string, any>): string;

        /**
         * 拼接规范化的 headers。
         * @returns `[canonicalHeaders, signedHeaderNames]` 元组
         */
        headersCanonicalization(
            headers: Record<string, any>,
            headersToSign?: AuthHeadersToSign
        ): CanonicalHeadersResult;

        /** HMAC-SHA256，输出 hex 字符串 */
        hash(data: string, key: string): string;

        /** 将 epoch 秒级时间戳转换为 ISO8601（`YYYY-MM-DDTHH:mm:ssZ`） */
        getTimestamp(timestamp?: number): string;

        /**
         * URL 安全的转义编码。
         * @param string         待编码字符串
         * @param encodingSlash  是否对 `/` 进行编码，默认为 `true`，传 `false` 时保留 `/`
         */
        normalize(string: string | null, encodingSlash?: boolean): string;

        /** 针对 `bos-share.baidubce.com` 场景生成规范化 URI */
        generateCanonicalUri(url: string): string;
    }
}

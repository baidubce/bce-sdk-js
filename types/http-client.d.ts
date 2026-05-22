/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file http-client.d.ts
 * @module src/http_client.js
 * @description SDK 内部 HTTP 客户端。各业务 Client 通过其发送请求；
 *              一般情况下使用方不应直接实例化，但暴露其类型用于自定义场景。
 */

/// <reference path="base.d.ts" />

declare namespace BaiduBCE {
    /** Node.js 可读流类型（来自 stream 模块） */
    type Readable = import('stream').Readable;
    /** Node.js 可写流类型 */
    type Writable = import('stream').Writable;

    /**
     * 自定义签名函数。返回值可以是同步字符串或异步 Promise，最终落到 `Authorization` 请求头。
     */
    type SignatureFunction = (
        credentials: Credentials['credentials'],
        httpMethod: string,
        path: string,
        params: Record<string, any>,
        headers: Record<string, any>,
        context: HttpClient
    ) => string | Promise<string>;

    /**
     * SDK 内部 HTTP 客户端，承载所有 BCE 子产品请求。
     *
     * 在 Node.js 环境基于 `http` / `https` 模块；在浏览器环境通过 browserify 适配为 `xhr`。
     * 实现继承自 `EventEmitter`，可监听上传相关事件（`progress` / `error` / `abort` / `timeout`）。
     */
    class HttpClient {
        constructor(config: BceClientOptions);

        /** 当前实例配置 */
        config: BceClientConfig;

        /**
         * 当前进行中的底层请求对象。
         *
         * - Node.js 环境：`http.ClientRequest`
         * - 浏览器环境：browserify 适配后的 xhr 实例
         *
         * 仅在请求发起后才会被赋值；未请求时为 `null`。
         */
        _req: any;

        /**
         * 发送 HTTP 请求。
         *
         * @param httpMethod    HTTP 方法（GET / POST / PUT / DELETE / HEAD）
         * @param path          请求路径
         * @param body          请求体；当为可读流时必须显式设置 `Content-Length`
         * @param headers       请求头
         * @param params        URL 查询参数
         * @param signFunction  自定义签名函数；不传则使用 `Auth.generateAuthorization`
         * @param outputStream  响应体的写入流（仅 Node.js 下生效）
         */
        sendRequest<TBody = any, THeader extends Record<string, any> = OpenAPIHeaders>(
            httpMethod: string,
            path: string,
            body?: string | Buffer | Blob | ArrayBuffer | Readable,
            headers?: Record<string, any>,
            params?: Record<string, any>,
            signFunction?: SignatureFunction,
            outputStream?: Writable
        ): PromiseResult<TBody, THeader>;

        /**
         * 基于对象路径更新 `this.config` 中的字段，不会破坏原对象引用。
         * 例如：`updateConfigByPath('credentials.ak', 'NEW_AK')`
         *
         * @returns 更新后的 config 对象（即 `this.config` 本身）
         */
        updateConfigByPath(path: string, value: any): HttpClient['config'];

        /** 构建 querystring（按 BCE 规则做百分号编码） */
        buildQueryString(params: Record<string, any>): string;

        /* -------------------- EventEmitter 兼容方法 -------------------- */
        on(event: string, listener: (...args: any[]) => void): this;
        once(event: string, listener: (...args: any[]) => void): this;
        off(event: string, listener: (...args: any[]) => void): this;
        emit(event: string, ...args: any[]): boolean;
        removeListener(event: string, listener: (...args: any[]) => void): this;
        removeAllListeners(event?: string): this;

        /* -------------------- 以下为内部方法（标记为 internal） -------------------- */
        /** @internal */
        _isValidStatus(statusCode: number): boolean;
        /** @internal */
        _doRequest(options: any, body: any, outputStream?: Writable): Promise<any>;
        /** @internal */
        _generateRequestId(): string;
        /** @internal */
        _guessContentLength(data: any): number;
        /** @internal */
        _fixHeaders(headers: Record<string, any> | undefined): Record<string, any>;
        /** @internal */
        _recvResponse(res: any): Promise<any>;
        /** @internal */
        _sendRequest(req: any, data: any): void;
        /** @internal */
        _getRequestUrl(path: string, params: Record<string, any>): string;
    }
}

/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file bce-base-client.d.ts
 * @module src/bce_base_client.js
 * @description
 * 各业务 Client（BosClient / CfcClient / STS 等）的公共基类。
 * 负责 endpoint 计算、签名构造、HTTP 请求委派与时间偏移自适应重试。
 */

/// <reference path="base.d.ts" />
/// <reference path="http-client.d.ts" />

declare namespace BaiduBCE {
    /** sendRequest / sendHTTPRequest 的可变参数对象 */
    interface BceBaseClientArgs {
        /** 请求体 */
        body?: string | Buffer | Blob | ArrayBuffer | Readable | null;
        /** 请求头 */
        headers?: Record<string, any>;
        /** URL 查询参数 */
        params?: Record<string, any>;
        /** 局部覆盖配置 */
        config?: RequestConfig;
        /** 输出流（仅 Node.js） */
        outputStream?: Writable | null;
    }

    /**
     * BCE 通用基础客户端。继承自 Node.js `EventEmitter`，实例上可监听上传事件
     * （`progress` / `error` / `abort` / `timeout`），由内部 `HttpClient` 透传。
     */
    class BceBaseClient {
        /**
         * @param clientConfig    客户端配置，会与 `config.DEFAULT_CONFIG` 合并
         * @param serviceId       服务标识，用于自动拼接默认 endpoint，如 `'bos'` / `'sts'`
         * @param regionSupported 服务是否支持区域，默认为 `false`
         */
        constructor(clientConfig: BceClientOptions, serviceId: string, regionSupported?: boolean);

        /** 合并默认配置后的运行时 config */
        config: BceClientConfig;
        /** 服务标识 */
        serviceId: string;
        /** 是否支持区域 */
        regionSupported: boolean;

        /**
         * 内部 HTTP 客户端。请求发起后才会被赋值；首次请求前为 `null`。
         */
        _httpAgent: HttpClient | null;

        /**
         * 服务端时间偏移（毫秒），用于在收到 `RequestTimeTooSkewed` 错误后调整本地时间戳。
         * 挂在原型上，跨实例共享。
         */
        timeOffset?: number;

        /**
         * 默认签名函数：根据 `credentials` + 当前时间戳生成 `Authorization` 头。
         * 子类可覆盖以接入自定义签名逻辑。形态与 `RequestConfig.createSignature` 一致。
         */
        createSignature: CreateSignatureFunction;

        /**
         * 通用请求入口。若配置了 `sessionToken` 会自动注入 `x-bce-security-token` 头。
         *
         * 子类可重写此方法采用更具体的签名（例如 `BosClient.sendRequest`
         * 将第二个参数改为聚合的 `BosRequestArgs` 对象）。这里以宽松签名声明，让重写不触发 TS2416。
         */
        sendRequest(httpMethod: string, ...args: any[]): Promise<any>;

        /**
         * 实际发起 HTTP 请求；遇到 `RequestTimeTooSkewed` 会根据响应头校正
         * `timeOffset` 后自动重试一次。
         */
        sendHTTPRequest<TBody = any, THeader extends Record<string, any> = OpenAPIHeaders>(
            httpMethod: string,
            resource: string,
            args: Required<BceBaseClientArgs>,
            config: BceClientConfig
        ): PromiseResult<TBody, THeader>;

        /** 判断错误是否为 AbortController 取消（兼容浏览器与 Node.js 错误形态） */
        isAbortError(error: unknown): boolean;

        /* -------------------- EventEmitter 兼容方法 -------------------- */
        on(event: string, listener: (...args: any[]) => void): this;
        once(event: string, listener: (...args: any[]) => void): this;
        off(event: string, listener: (...args: any[]) => void): this;
        emit(event: string, ...args: any[]): boolean;
        removeListener(event: string, listener: (...args: any[]) => void): this;
        removeAllListeners(event?: string): this;

        /** @internal 计算最终 endpoint */
        _computeEndpoint(): string;
    }
}

/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file base.d.ts
 *
 * @description
 * 通用、共享、抽象类型定义集中地。具体业务（BOS / CFC / STS 等）相关的类型放在
 * 对应的 `xxx-client.d.ts` 文件内，避免本文件与单一业务耦合。
 *
 * 所有类型均挂在 `BaiduBCE` 命名空间下，跨文件通过命名空间合并 + 同空间引用即可使用，
 * 不需要 ES module import；详见 `index.d.ts` 文件头部约束说明。
 */

declare namespace BaiduBCE {
    /*****************************************************************************************
     *                                身份与区域基础类型
     ****************************************************************************************/
    interface Credentials {
        /** 主账户的临时身份凭证。 [参考文档](https://cloud.baidu.com/doc/IAM/s/Qjwvyc8ov#getsessiontoken) */
        sessionToken?: string;

        credentials: {
            /** 百度云账户体系 `Access Key` [参考文档](https://cloud.baidu.com/doc/Reference/s/9jwvz2egb) */
            ak: string;
            /** 百度云账户体系 `Secret Access Key` [参考文档](https://cloud.baidu.com/doc/Reference/s/9jwvz2egb) */
            sk: string;
        };
    }

    /*****************************************************************************************
     *                            HTTP 观测器（httpObserver）
     ****************************************************************************************/
    /** 观测事件阶段 */
    type HttpObserverPhase = 'start' | 'firstByte' | 'end' | 'error' | 'abort';

    /**
     * 单次 HTTP 请求观测事件载荷。`SDK` 在 `_doRequest` 内对每个请求依阶段触发回调。
     * 任意阶段宿主异常都不会影响业务请求，所有调用均处于 try/catch 兜底中。
     */
    interface HttpObserverEvent {
        /** 请求生命周期内唯一 ID，可在多阶段事件间关联 */
        requestId: string;
        /** 触发阶段 */
        phase: HttpObserverPhase;
        /** HTTP 方法 */
        method: string;
        /** 目标主机（host header，不含端口） */
        host: string;
        /** 请求路径（含 query） */
        path: string;
        /** 请求开始的 epoch 毫秒时间戳 */
        startedAt: number;
        /** 首字节到达耗时（ms），仅 firstByte / end / error / abort 阶段携带 */
        ttfbMs?: number;
        /** 请求总耗时（ms），仅 end / error / abort 阶段携带 */
        durationMs?: number;
        /** HTTP 状态码，end / firstByte / error 阶段携带 */
        statusCode?: number;
        /** 请求体已发送字节数 */
        bytesSent?: number;
        /** 响应体已接收字节数 */
        bytesReceived?: number;
        /** 错误码（error / abort 阶段） */
        errorCode?: string;
        /** 由调用方在 BceClientOptions.observerContext 注入的上下文，原样回传 */
        context?: Record<string, any>;
    }

    /** httpObserver 回调函数类型 */
    type HttpObserverFn = (event: HttpObserverEvent) => void;

    /*****************************************************************************************
     *                            HTTP / OpenAPI 通用响应类型
     ****************************************************************************************/

    /** OpenAPI 通用请求头，注意 SDK 在 Node.js 环境中请求响应的 headers 统一为小写格式 */
    interface OpenAPIHeaders {
        /** 服务器是否断开连接，通常默认为 close */
        'connection': 'close' | 'keep-alive' | 'Upgrade' | '';
        /** HTTP 1.1协议中规定的请求时间，格式为GMT时间，eg: 'Tue, 23 Dec 2025 02:30:46 GMT', */
        'date': string;
        /** RFC2616中定义的HTTP请求内容长度，单位byte */
        'content-length': string;
        /** 服务器的名字，取值为对应服务的缩写，eg: BOS服务为'BceBos'，STS服务为'BWS' */
        'server': string;
        /** 响应媒体类型，通常查询类接口返回'application/json; charset=utf-8'，对象类接口返回对应Object的媒体类型 */
        'content-type': string;
        /** 由BCE BOS创建，用于帮助排除故障的标识ID，如果在使用BOS过程中遇到问题，可以在工单中提供该字段便于快速定位问题 */
        'x-bce-debug-id'?: string;
        /** 由BCE对应服务创建，是请求百度云服务的唯一标识 */
        'x-bce-request-id': string;
    }

    interface Result<TBody = any, THeader extends Record<string, any> = OpenAPIHeaders> {
        http_headers: THeader;
        body: TBody;
    }

    /** 兼容旧 SDK 类型：PromiseResult 等价于 Promise<Result<...>> */
    type PromiseResult<TBody = any, THeader extends Record<string, any> = OpenAPIHeaders> = Promise<
        Result<TBody, THeader>
    >;

    /*****************************************************************************************
     *                            通用请求级配置
     ****************************************************************************************/
    /** HTTP 请求方法 */
    type HttpMethod = 'POST' | 'GET' | 'DELETE' | 'PUT' | 'HEAD' | 'OPTIONS';

    /**
     * 自定义签名函数。返回值为最终落到 `Authorization` 请求头的字符串，
     * 与 `BceBaseClient.createSignature` 默认实现保持一致的入参形态。
     *
     * 与 `HttpClient` 内部使用的 `SignatureFunction` 区别：本类型供业务侧
     * 通过 `RequestConfig.createSignature` 注入，无需感知 HttpClient 实例。
     */
    type CreateSignatureFunction = (
        credentials: Credentials['credentials'],
        httpMethod: string,
        path: string,
        params: Record<string, any>,
        headers: Record<string, any>
    ) => string | Promise<string>;

    /**
     * 单次请求级配置。可作为请求入参 `config` 字段传入以覆盖客户端实例配置。
     *
     * 注意：BOS 业务相关的字段（lccLocation / customGenerateUrl / removeVersionPrefix）
     * 由 `bos-client.d.ts` 中的 `BosRequestConfig` 扩展定义，本接口仅保留跨服务通用字段。
     */
    interface RequestConfig {
        /** 区域配置 */
        region?: string;
        /** 自定义请求域名 */
        endpoint?: string;
        /** AbortSignal 实例对象 */
        signal?: AbortSignal;
        /**
         * @deprecated SDK<=1.0.7版本通过返回 [Promise<BosResponse>, ClientRequest] 元组用于取消请求。
         * 现已迁移到 AbortSignal（推荐）方案，将在后续版本中移除该字段。
         */
        requestInstance?: boolean;
        /**
         * 自定义签名函数。设置后将覆盖 `BceBaseClient.createSignature` 默认实现，
         * 用于注入临时凭据、第三方签名服务等场景。形态与基类同名方法保持一致。
         */
        createSignature?: CreateSignatureFunction;
    }

    /*****************************************************************************************
     *                            通用 BCE 客户端配置（BceBaseClient / HttpClient）
     ****************************************************************************************/

    /** 代理服务器配置 */
    interface ProxyConfig {
        host: string;
        port: number;
    }

    /**
     * 实例化任意 BCE 客户端时通用的入参字段。
     *
     * 对应 `src/bce_base_client.js` 中合并 `DEFAULT_CONFIG` 之前的 `clientConfig`。
     * 各业务子类（BosClient 等）在此基础上扩展自有字段。
     */
    type BceClientOptions = {
        /** 服务 endpoint，如 `https://bj.bcebos.com` */
        endpoint: string;
        /** HTTP 协议，默认 `http`，会被 `DEFAULT_CONFIG` 注入 */
        protocol?: 'http' | 'https';
        /** 区域，默认 `bj` */
        region?: string;
        /** 代理服务器配置（仅 Node.js 环境生效） */
        proxy?: ProxyConfig;
        /**
         * HTTP 请求观测器回调。
         *
         * 设置后，SDK 内部 `_doRequest` 会在 `start / firstByte / end / error / abort`
         * 五个阶段触发回调，便于宿主侧实现网络质量检测、链路追踪等被动观测能力，对业务无侵入。
         * 未设置时走 fast-path，零额外开销。
         */
        httpObserver?: HttpObserverFn;
        /**
         * 透传给 httpObserver 的上下文对象，例如 `{taskId, partNumber, region, lccLocation}`。
         * 由调用方维护语义，SDK 仅在事件中原样回传。
         */
        observerContext?: Record<string, any>;
    } & Credentials;

    /**
     * BceBaseClient 运行时 `this.config` 的形态：在 `BceClientOptions` 基础上
     * 由 `DEFAULT_CONFIG` 强制注入 `protocol` / `region` / `pathStyleEnable`。
     */
    type BceClientConfig = BceClientOptions & {
        protocol: 'http' | 'https';
        region: string;
        pathStyleEnable?: boolean;
    };
}

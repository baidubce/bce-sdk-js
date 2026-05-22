/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file sts.d.ts
 * @module src/sts.js
 * @description STS 服务客户端，对应 [获取临时身份凭证文档](https://bce.baidu.com/doc/IAM/s/Qjwvyc8ov#getsessiontoken)。
 */

/// <reference path="base.d.ts" />

declare namespace BaiduBCE {
    /** STS 接口请求 ACL 子项 */
    interface StsAccessControl {
        /** 企业账户 ID */
        eid?: string;
        /** 服务名，如 `bos` */
        service: string;
        /** 区域，如 `bj` */
        region: string;
        /** 效果，`Allow` / `Deny` */
        effect: string;
        /** 资源列表 */
        resource: string[];
        /** 权限列表 */
        permission: string[];
    }

    /** `getSessionToken` 入参中的可选 ACL 配置 */
    interface StsAccessControlParams {
        /** 临时凭证 ID */
        id?: string;
        /** 访问控制列表 */
        accessControlList?: StsAccessControl[];
    }

    /** STS 接口的统一返回结构 */
    type StsResponse<TBody = any, THeader extends Record<string, any> = Record<string, any>> = Promise<
        Result<TBody, OpenAPIHeaders & THeader & {server: 'BWS'}>
    >;

    /** `getSessionToken` 返回的临时凭证信息 */
    interface StsSessionToken {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
        /** 创建时间，UTC 字符串 */
        createTime: string;
        /** 过期时间，UTC 字符串 */
        expiration: string;
        /** 关联用户 ID */
        userId: string;
    }

    /**
     * STS 客户端：用于换取临时身份凭证。
     *
     * @platform Node.js | Browser
     */
    class STS extends BceBaseClient {
        constructor(options: BceClientOptions);

        config: BceClientConfig;

        /**
         * 获取临时身份凭证。
         *
         * @param durationSeconds  凭证有效期（秒），范围 [60, 129600]
         * @param params           可选 ACL 配置
         * @param options          局部请求配置，可覆盖实例 `config`
         */
        getSessionToken(
            durationSeconds: number,
            params?: StsAccessControlParams,
            options?: BosClientAPIOptions
        ): StsResponse<StsSessionToken>;
    }
}

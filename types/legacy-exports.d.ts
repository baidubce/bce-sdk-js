/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file legacy-exports.d.ts
 *
 * @description
 * index.js 上挂出但尚未补充完整 TS 类型的成员，按运行时形态给出占位声明，
 * 保证 `SDK.xxx` 在消费方使用时不会出现 "Property xxx does not exist on type" 的报错。
 *
 * 待具体类型补齐后，可以从这里挪到对应的 d.ts 文件（如 src/<client>.js → types/<client>.d.ts），
 * 与现有 bos-client / cfc-client / sts / mime.types / crypto / http-client 风格保持一致。
 */

/// <reference path="base.d.ts" />

declare namespace BaiduBCE {
    // -------- 顶层工具 --------
    /** Q promise 库实例，原样透出，类型见 `@types/q` */
    const Q: any;

    /** package.json 中的 SDK 版本号 */
    const version: string;

    /** src/strings.js —— 字符串工具集合 */
    const strings: {
        [key: string]: any;
    };

    // -------- 业务客户端占位（待逐个补齐具体签名） --------
    // 这些 Client 在运行时均通过 `util.inherits(XxxClient, BceBaseClient)` 继承，
    // 这里通过 `extends BceBaseClient` 在类型层面体现该关系。
    class BccClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class BcsClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class SesClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class QnsClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class LssClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class MctClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class FaceClient       extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class OCRClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class MediaClient      extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class VodClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class DocClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class TsdbDataClient   extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class TsdbAdminClient  extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class BtsClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
    class IoTClient        extends BceBaseClient { constructor(...args: any[]); [key: string]: any; }
}

/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file cfc-client.d.ts
 * @description CFC服务声明文件
 */

declare namespace BaiduBCE {
    type CfcResponse<TBody = any, THeader = {}> = PromiseResult<
        TBody, THeader & OpenAPIHeaders
    >

    type CFCFunctionItem = {
        Uid: string,
        Description: string,
        FunctionBrn: string,
        Region: string,
        Timeout: number,
        VersionDesc: string,
        UpdatedAt: string,
        LastModified: string,
        CodeSha256: string,
        MemorySize: number,
        LayerSha256: string,
        FunctionName: string,
        Handler: string,
        Runtime: string,
        CommitID: string,
        Layers: Array<string>,
        LogType: string,
        LogBosDir: string,
        VpcConfig: VpcConfig,
        DeadLetterTopic: string,
        Environment: {
            Variables: object
        }
    }

    type VpcConfig = {
        VpcId: string,
        SubnetIds: Array<string>,
        SecurityGroupIds: Array<string>
    }

    type CreateFunctionConfiguration = {
        Description?: string,
        Timeout: number,
        FunctionName: string,
        Handler: string,
        Runtime: string,
        MemorySize?: number,
        LogType?: string,
        LogBosDir?: string,
        VpcConfig?: VpcConfig,
        DeadLetterTopic?: string,
        Environment?: {
            Variables: {}
        }
    }

    type UpdateFunctionConfiguration = {
        Description?: string,
        Timeout?: number,
        Handler?: string,
        Runtime?: string,
        MemorySize?: number,
        LogType?: string,
        LogBosDir?: string,
        VpcConfig?: VpcConfig,
        DeadLetterTopic?: string,
        Environment?: {
            Variables: {}
        }
    }

    type Alias = {
        AliasBrn: string,
        FunctionName: string,
        FunctionVersion: string,
        Name: string,
        Description: string,
        Uid: string,
        UpdatedAt: string,
        CreatedAt: string
    }

    type FunctionCodeBody = {
        ZipFile: string,
        Publish?: boolean,
        DryRun?: boolean,
    }

    type CreateFunctionBody = { Code: FunctionCodeBody } & CreateFunctionConfiguration

    /** 百度智能云 `CFC` 服务客户端 */
    class CfcClient extends BceBaseClient {
        constructor(options: { endpoint: string } & Credentials);

        /**
         * `函数操作接口`: 列出请求者拥有的所有函数。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/Zjwvz46l3)
         */
        listFunctions(opt_options?: { Marker?: number, MaxItems?: number }): CfcResponse<{
            Functions: Array<CFCFunctionItem>
        }>;

        /**
         * `函数操作接口`: 创建函数。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/xjwvz450q)
         */
        createFunction(body: CreateFunctionBody): CfcResponse<CFCFunctionItem>;

        /**
         * `函数操作接口`: 获取某个函数的代码地址和详细配置。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/Kjwvz45ri)
         */
        getFunction(functionName: string, opt_options?: { Qualifier: string }): CfcResponse<{
            Code: { Location: string, RepositoryType: string },
            Configuration: CFCFunctionItem,
        }>;

        /**
         * `函数操作接口`: 删除某个函数。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/fjwvz472b)
         */
        deleteFunction(functionName: string, opt_options?: { Qualifier: string }): CfcResponse;

        /**
         * `函数操作接口`: 调用函数。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/vjwvz4e9n)
         */
        invocations(functionName: string, body: {}, opt_options?: { Qualifier?: string, logToBody?: boolean, invocationType?: string, logType?: string }): CfcResponse;

        /**
         * `函数操作接口`: 更新函数的代码。ZipFile 参数为函数 zip 包的 base64-encoded 的字符串。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/jjwvz45ex)
         */
        updateFunctionCode(functionName: string, body: { ZipFile: string, Publish?: boolean, DryRun?: boolean }): CfcResponse;

        /**
         * `函数操作接口`: 获取函数配置。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/9jwvz466u)
         */
        getFunctionConfiguration(functionName: string, opt_options?: { Qualifier: string }): CfcResponse;

        /**
         * `函数操作接口`: 更改函数配置。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/2jwvz44ns)
         */
        updateFunctionConfiguration(functionName: string, body: UpdateFunctionConfiguration): CfcResponse;

        /**
         * `版本操作接口`: 获取函数版本列表。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/Gjwvz4dyc)
         */
        listVersionsByFunction(functionName: string, opt_options?: { Marker?: number, MaxItems?: number }): CfcResponse<{ Versions: Array<CFCFunctionItem> }>;

        /**
         * `函数操作接口`: 为函数发布版本。
         * 
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/4jwvz4dn3)
         */
        publishVersion(functionName: string, description?: string): CfcResponse;

        /**
         * `别名操作接口`: 为函数创建别名，FunctionVersion 是别名要指向的函数版本。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/Pjwvz4bas)
         */
        createAlias(functionName: string, body: { FunctionVersion: string, Name: string, Description?: string }): CfcResponse<Alias>;

        /**
         * `别名操作接口`: 获取某个别名的详情。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/0jwvz4al5)
         */
        getAlias(functionName: string, aliasName: string): CfcResponse<Alias>;

        /**
         * `别名操作接口`: 修改别名指向的函数版本。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/2jwvz4c20)
         */
        updateAlias(functionName: string, aliasName: string, body: { FunctionVersion: string, Description?: string }): CfcResponse<Alias>;

        /**
         * `别名操作接口`: 删除别名。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/qjwvz4ax5)
         */
        deleteAlias(functionName: string, aliasName: string): CfcResponse;

        /**
         * `别名操作接口`: 获取一个函数所有的别名，若指定了特定版本，则只返回这个版本的别名。
         *
         * [更多文档](https://cloud.baidu.com/doc/CFC/s/njwvz4bnq)
         */
        listAliases(functionName: string, opt_options?: { FunctionVersion?: string, Marker?: number, MaxItems?: number }): CfcResponse<{ Aliases: Array<Alias> }>;
    }
}

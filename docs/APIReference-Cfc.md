---
id: api-reference-Cfc
title: CFC - api
layout: docs
category: API Reference
permalink: docs/api-reference-cfc.html
---

[百度 CFC (Cloud Function Compute)](https://cloud.baidu.com/doc/CFC/ProductDescription.html) 是百度开放云 BCE (Baidu Cloud Engine)提供基于事件机制,弹性、高可用、扩展性好、极速响应的云端无服务器计算能力。您可以仅关注业务逻辑的代码部分，无需关注和配置服务器资源，支持多种函数触发器，满足多样化的事件触发场景。

## CfcClient

CfcClient是CFC服务的javascript客户端，为调用者与CFC服务进行交互提供了一系列的方法。

- nodejs：`import {CfcClient} from 'bce-sdk-js'`

[CFC接口说明](https://cloud.baidu.com/doc/CFC/API.html#.E6.8E.A5.E5.8F.A3.E8.AF.B4.E6.98.8E)

### 初始化

```js
var config = {
    endpoint: 'http://cfc.bj.baidubce.com',
    credentials: {
        ak: '您的ak',
        sk: '您的sk'
    }
};
var client = new CfcClient(config);
```

## 函数接口

### 调用函数 invocations


参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName |String |是| path参数 |函数名
logToBody | Boolean | 否 | Query参数 | true把日志打印到返回
invocationType | String | 是 | Query参数 | Event(无返回)/RequestResponse(同步返回)/DryRun(测试函数)
logType | String | 否 | Query参数 | 日志类型 Tail / None
Qualifier | String | 否 | Query参数 | 默认为$LATEST 可选别名和版本

**Request Body**
	json数据格式，作为input参数调用函数

	```
	//自定义参数
	{
		"key3": "value3",
		"key2": "value2",
		"key1": "value1"
	}
	```

如下代码可以调用函数：

```js
var functionName = <functionName>; // 指定function的名称
var invoke_body = 	{
                  		"key3": "value3",
                  		"key2": "value2",
                  		"key1": "value1"
                  	};
var invoke_options = {
                         "logToBody": "false",
                         "invocationType": "RequestResponse",
                         "logType": "None",
                         "Qualifier": "$LATEST"
                     };
client.invocations(functionName,invoke_body,invoke_options)
    .then(function (response) {
        // 执行函数
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });
```

## 函数操作

### createFunction

**描述**

- 本接口用于创建函数。

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
ZipFile| blob |是|RequestBody参数| 您要发布的zip包的 base64-encoded 注意zip包压缩目录的内容，而不是目录本身
Publish| Boolean |否|RequestBody参数| 是否直接发布版本
Description |String |否| RequestBody参数 |一个简短的说明 0-256字符
Environment | [Environment](#Environment) |否| RequestBody参数 |环境变量
FunctionName |String |是| RequestBody参数 |函数名 1-140字符
Handler |String |是| RequestBody参数 | cfc调用的入口函数，对于node为module-name.export eg. index.handler
MemorySize|int|否| RequestBody参数 | 内存大小 现在为128固定 |
Region |String |否| RequestBody参数 | 地址 bj|
Runtime |String |是| RequestBody参数 |运行语言 python2 nodejs6.11
Timeout |int |是| RequestBody参数 |超时时间 1-300 最大300

如下代码可以创建函数：

```js
    var body = {
        "Code": {
            "ZipFile": "UEsDBBQACAAIAAAAAAAAAAAAAAAAAAAAAAAIAAAAaW5kZXguanNKrSjILyop1stIzEvJSS1SsFXQSC1LzSvRUUjOzytJrQAxEnNykhKTszUVbO0UqrkUFBTgQhp5pTk5OgpgHdFKiUqxmtZctdaAAAAA//9QSwcI9fw51k4AAABUAAAAUEsBAhQAFAAIAAgAAAAAAPX8OdZOAAAAVAAAAAgAAAAAAAAAAAAAAAAAAAAAAGluZGV4LmpzUEsFBgAAAAABAAEANgAAAIQAAAAAAA==",
            "Publish": false,
        },
        "Description": "bce_sdk_test",
        "Region": "bj",
        "Timeout": 3,
        "FunctionName": "bce_sdk_test",
        "Handler": "index.handler",
        "Runtime": "nodejs6.11",
        "MemorySize": 128,
        "Environment": {
            "Variables": {
                "a": "b",
            }
        }
    };
    client.createFunction(body).then(function (response) {
        // 创建函数
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });
```

### listFunctions

**描述**

- 本接口用于查询用户函数。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionVersion |String |否| Query参数 | 函数版本
page |int |否| Query参数 | 页号
pageSize | int |否| Query参数 | 页面大小
Marker |int|否|Query参数 |
MaxItems |int|否|最大数目| 1-10000

如下代码可以创建函数：

```js
    var options = {};
    options.marker = 10;
    client.listFunctions(options).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

### getFunction

**描述**

- 本接口用于查询用户单个函数。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
Qualifier |String |否| Query参数 |  默认为$LATEST 可选别名和版本

如下代码可以获取函数：

```js
    var functionName = <functionName>;
    client.getFunction(functionName).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

### DeleteFunction

**描述**

- 本接口用于删除函数。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称

如下代码可以删除函数：

```js
    var functionName = <functionName>;
    client.deleteFunction(functionName).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

### updateFunctionCode

**描述**

- 本接口用于更新指定function代码。
<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
ZipFile |String |否| body参数 | Base64-encoded binary data object
Publish |String |否| body参数 | 是否直接发布
DryRun |String |否| body参数 | 这个布尔参数可用于测试您对cfc的请求，以更新cfc函数，并将一个版本作为原子操作发布。它将对你的代码进行所有必要的计算和验证，但是不会上传它或者发布一个版本。每次调用该操作时，所提供代码的CodeSha256散列值也将在响应中计算并返回。 暂未支持

如下代码可以更新指定function代码：

```js
    var functionName = <functionName>;
    var code = {
                   "ZipFile": "UEsDBBQACAAIAAAAAAAAAAAAAAAAAAAAAAAIAAAAaW5kZXguanNKrSjILyop1stIzEvJSS1SsFXQSC1LzSvRUUjOzytJrQAxEnNykhKTszUVbO0UqrkUFBTgQhp5pTk5OgpgHdFKiUqxmtZctdaAAAAA//9QSwcI9fw51k4AAABUAAAAUEsBAhQAFAAIAAgAAAAAAPX8OdZOAAAAVAAAAAgAAAAAAAAAAAAAAAAAAAAAAGluZGV4LmpzUEsFBgAAAAABAAEANgAAAIQAAAAAAA==",
                   "Publish": false,
                   "DryRun": true
               }
    client.updateFunctionCode(functionName, code).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

### getFunctionConfiguration

**描述**

- 本接口用于获取指定函数配置。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
Qualifier |String |否| Query参数 |  默认为$LATEST 可选别名和版本

如下代码可以获取指定函数配置：

```js
    var functionName = <functionName>;
    var option = {
        "Qualifier": "1"
    };
    client.getFunctionConfiguration(functionName, option).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```


### updateFunctionConfiguration

**描述**

- 本接口用于修改函数配置。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
Qualifier |String |否| Query参数 | 函数版本 只有$LATEST才能修改
Timeout |int |否| body参数 | 超时时间
Handler |String |否| body参数 | 入口
Runtime |String |否| body参数 | 运行语言  python2 nodejs6.11
Environment | [Environment](#Environment) |否| body参数 | 环境变量

如下代码可以获取指定函数配置：

```js
    var functionName = <functionName>;
    var body = {
        "Description": "bce_sdk_test",
        "Region": "bj",
        "Timeout": 3,
        "FunctionName": "bce_sdk_test",
        "Handler": "index.handler",
        "Runtime": "nodejs6.11",
        "MemorySize": 128,
        "Environment": {
            "Variables": {
                "a": "b",
            }
        }
    };
    client.updateFunctionConfiguration(functionName, body).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

## 版本操作

### listVersionsByFunction

**描述**

- 本接口用于查询函数所有版本。
- 
<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
Marker |int |否| Query参数 | 标记
MaxItems |int |否| Query参数 | 最大数目 1-10000

如下代码可以获取指定函数配置：

```js
    var functionName = <functionName>;
    var opt_options = {
        "Marker":0,
        "MaxItems":10
    };
    client.listVersionsByFunction(functionName, opt_options).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

### publishVersion

**描述**

- 本接口用于发布函数版本。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
Description|string|否|body参数|版本描述|

如下代码可以发布函数版本：

```js
    var functionName = <functionName>;
    client.publishVersion(functionName, "description").then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```


## 别名操作

### listAliases

**描述**

- 本接口用于查询函数所有别名。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
FunctionVersion|String|是|Query参数|函数版本
Marker |int |否| Query参数 | 标记
MaxItems |int |否| Query参数 | 最大数目 1-10000

如下代码可以发布函数版本：

```js
    var opt_options = {
        "Marker":0,
        "MaxItems":10,
        "FunctionVersion":"1"
    };
    var functionName = <functionName>;
    client.listAliases(functionName, "description").then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });

```

### createAlias

**描述**

- 本接口用于创建别名。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
FunctionVersion|String|是| body参数|别名指向函数版本 可以设置为$LATEST
Name |String|是| body参数|别名名称
Description|string|否|body参数|别名描述|

如下代码可以创建别名：

```js
     var body = {
        "FunctionVersion": "string",
        "Name": "string",
        "Description": "string"
     }
    var functionName = <functionName>;
    client.createAlias(functionName, body).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });
```


### getAlias

**描述**

- 本接口用于查询别名详情。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
aliasName |String|是| path参数|别名名称
FunctionName|String|是|path参数|函数名称

如下代码可以创建别名：

```js

    var functionName = <functionName>;
    var aliasName = <aliasName>
    client.getAlias(functionName, aliasName).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });
```

### UpdateAlias

**描述**

- 本接口用于修改别名。


<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
FunctionVersion|String|是| body参数|别名指向函数版本 可以设置为$LATEST
Description|string|否|body参数|别名描述|

如下代码可以修改别名：

```js

    var functionName = <functionName>;
    var aliasName = <aliasName>
    var body = {
        "FunctionVersion": "string",
        "Description": "string"
    }
    client.updateAlias(functionName, aliasName, body).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });
```

### DeleteAlias

**描述**

- 本接口用于删除别名。

<b>请求参数<b>

参数名称 | 类型 | 是否必需 | 参数位置 | 描述
--- | --- | --- | --- | ---
FunctionName|String|是|path参数|函数名称
aliaName|String|是| path参数|别名名称

如下代码可以删除别名：

```js

    var functionName = <functionName>;
    var aliasName = <aliasName>
    client.deleteAlias(functionName, aliasName).then(function (response) {
        // 执行成功
        console.log(response.body)
    })
    .catch(function (error) {
        // 执行失败
    });
```

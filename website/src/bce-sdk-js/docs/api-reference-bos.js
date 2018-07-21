/**
 * @generated
 */
var React = require("React");
var Layout = require("DocsLayout");
var content = `
[百度对象存储BOS(Baidu Object Storage)](https://bce.baidu.com/product/bos.html)，是百度开放云对外提供的稳定、安全、高效以及高扩展存储服务，支持文本、多媒体、二进制等任何类型的数据存储。数据多地域跨集群的存储，以实现资源统一利用，降低使用难度，提高工作效率。

百度开放云目前开通了多区域支持，请参考[区域选择说明](https://bce.baidu.com/doc/Reference/Regions.html)。BOS 目前支持“华北-北京”和“华南-广州”两个区域。

BOS API的服务域名为：

Region|Protocol|Endpoint
---|---|---
BJ|HTTP or HTTPS|http(s)://bj.bcebos.com
GZ|HTTP or HTTPS|http(s)://gz.bcebos.com

BOS API支持HTTP和HTTPS两种调用方式。为了提升数据的安全性，建议通过HTTPS调用。

## BosClient

BosClient是BOS服务的javascript客户端，为调用者与BOS服务进行交互提供了一系列的方法。

- 浏览器端：\`var BosClient = baidubce.sdk.BosClient\`
- nodejs：\`import {BosClient} from 'bce-sdk-js'\`

### 初始化

\`\`\`js
var config = {
    endpoint: 'http://bos.bj.baidubce.com',
    credentials: {
        ak: '您的ak',
        sk: '您的sk'
    }
};
var client = new BosClient(config);
\`\`\`

## Bucket

Bucket既是BOS上的命名空间，也是计费、权限控制、日志记录等高级功能的管理实体。

- Bucket名称在所有区域中具有全局唯一性，且不能修改。
- 存储在BOS上的每个Object都必须包含在一个Bucket中。
- 一个用户最多可创建100个Bucket，但每个Bucket中存放的Object的数量和大小总和没有限制，用户不需要考虑数据的可扩展性。

### 命名规范

Bucket的命名有以下规范：

- 只能包括小写字母，数字，短横线（-）。
- 必须以小写字母或者数字开头。
- 长度必须在3-63字节之间。

### 新建Bucket

如下代码可以新建一个Bucket：

\`\`\`js
var newBucketName = <bucketName>; // 指定Bucket的名称
client.createBucket(newBucketName)
    .then(function () {
        // 创建完成，用户添加自已的代码；
    })
    .catch(function (error) {
        // 创建失败，用户添加自己的代码，处理异常
    });
\`\`\`

### 查看Bucket列表

如下代码可以列出用户所有的Bucket：

\`\`\`js
client.listBuckets()
    .then(function (response) {
        var buckets = response.body.buckets || [];
        for (var i = 0 , l = buckets.length; i < l; i++) {
            console.log(buckets[i].name);
        }
    })
    .catch(function () {
        // 查询失败，用户添加自己的代码，处理异常
    });
\`\`\`

### 判断Bucket是否存在

若用户需要判断某个Bucket是否存在，则如下代码可以做到：

\`\`\`js
client.doesBucketExist(<bucketName>)
    .then(function (response) {
        if(response) {
            console.log('bucket存在');
        }
        else {
            console.log('bucket不存在');
        }
    })
    .catch(function () {
        // 查询失败，用户添加自己的代码，处理异常
    });
\`\`\`

### 删除Bucket

如下代码可以删除一个Bucket：

\`\`\`
client.deleteBucket(<bucketName>)
    .then(function () {
        // 删除完成
    })
    .catch(function (error) {
        // 删除失败
    });
\`\`\`
复制
注意：如果Bucket不为空（即Bucket中有Object存在），则Bucket无法被删除，必须清空Bucket后才能成功删除。

### Bucket权限控制

#### 设置Bucket的访问权限

如下代码将Bucket的权限设置为了\`private\`：

\`\`\`js
client.setBucketCannedAcl(<bucketName>, 'private')
    .then(function () {
        // 设置完成
    })
    .catch(function (error) {
        // 设置失败
    });
\`\`\`

除了\`private\`，还有\`public-read\`和\`public-read-write\`可以设置，它们分别对应不同的权限。具体内容可以参考《BOS API文档 [使用CannedAcl方式的权限控制](https://bce.baidu.com/doc/BOS/API.html#.4F.FA.21.55.58.27.F8.31.85.2D.01.55.89.10.A7.16)》。

#### 设置指定用户对Bucket的访问权限

BOS还可以实现设置指定用户对Bucket的访问权限，参考如下代码实现：

\`\`\`js
var grant_list = [
    {
        'grantee': [
            {'id': <userId1>}, // 授权给特定用户1
            {'id': <userId2>}, // 授权给特定用户2
        ],
        'permission': ['FULL_CONTROL'] // 设置权限为FULL_CONTROL
    },
    {
        'grantee': [
            {'id': <userId3>} // 授权给特定用户1
        ],
        'permission': ['READ'] // 设置权限为READ
    }
];
client.setBucketAcl(<bucketName>, grant_list)
    .then(function () {
        // 设置完成
    })
    .catch(function (error) {
        // 设置失败
    });
\`\`\`

注意：permission中的权限设置包含三个值：\`READ\`、\`WRITE\`、\`FULL_CONTROL\`，它们分别对应相关权限。具体内容可以参考《BOS API文档 [上传ACL文件方式的权限控制](https://bce.baidu.com/doc/BOS/API.html#.D4.56.61.2C.A5.B1.68.B6.42.32.3E.18.15.BD.CE.43)》。

## Object

在BOS中，用户操作的基本数据单元是Object。Object包含Key、Meta和Data。其中，Key是Object的名字；Meta是用户对该Object的描述，由一系列Name-Value对组成；Data是Object的数据。

### Object命名规范

Object的命名规范如下：

- 使用UTF-8编码。
- 长度必须在1-1023字节之间。
- 首字母不能为'/'。

### 简单上传

BOS支持多种形式的Object上传，参考如下代码：

\`\`\`js
function done(response) {
    // 上传完成
}
function fail(fail) {
    // 上传失败
}

// 以字符串形式上传
client.putObjectFromString(bucket, object, 'hello world')
    .then(done)
    .catch(fail);

// 以DataUrl形式上传
var dataUrl = new Buffer('hello world').toString('base64');
client.putObjectFromDataUrl(bucket, object, dataUrl)
    .then(done)
    .catch(fail);

// 以文件形式上传，仅支持nodejs环境
client.putObjectFromFile(bucket, object, <path-to-file>)
    .then(done)
    .catch(fail);

// 以blob对象形式上传，仅支持浏览器环境
client.putObjectFromBlob(bucket, object, <blob对象>)
    .then(done)
    .catch(fail);
\`\`\`

Object以文件的形式上传到BOS中，以上简单上传的函数支持不超过5GB的Object上传。在上传处理成功后，BOS会在Header中返回Object的ETag作为文件标识。

### 设定http header和自定义meta数据

sdk本质上是调用后台的HTTP接口，因此BOS服务允许用户自定义Http Header。同时也允许用户对要上传的Object添加自定义meta信息。以\`putObjectFromFile()\`函数为例，可以用以下代码来处理：
\`\`\`js
var options = {
    'Content-Length': <file.size>, // 添加http header
    'Content-Type': 'application/json', // 添加http header

    'x-bce-meta-foo1': 'bar1', // 添加自定义meta信息
    'x-bce-meta-foo2': 'bar2', // 添加自定义meta信息
    'x-bce-meta-foo3': 'bar3' // 添加自定义meta信息
}
client.putObjectFromFile(bucket, object, <path-to-file>, options)
    .then(done)
    .catch(fail);
\`\`\`

注意，自定义meta信息的key需要以\`x-bce-meta-\`开头。

### 分块上传

除了通过上述接口上传文件到BOS以外，BOS还提供了另外一种上传模式 —— Multipart Upload。用户可以在如下的应用场景内（但不仅限于此），使用Multipart Upload上传模式，如：

- 需要支持断点上传。
- 上传超过5GB大小的文件。
- 网络条件较差，和BOS的服务器之间的连接经常断开。
- 需要流式地上传文件。
- 上传文件之前，无法确定上传文件的大小。

具体的api及使用方法，请参考[大文件分块上传](advanced-topics-multiupload.html)

### 查看Bucket中的Object

#### 查看Bucket中Object列表

如下代码所示：

\`\`\`js
client.listObjects(<bucketName>)
    .then(function (response) {
        var contents = response.body.contents;
        for (var i = 0, l = contents.length; i < l; i++) {
            console.log(contents[i].key);
        }
    })
    .catch(function (error) {
        // 查询失败
    });
\`\`\`

注意：

1. 默认情况下，如果Bucket中的Object数量大于1000，则只会返回1000个Object，并且返回结果中\`IsTruncated\`值为\`true\`，并返回\`NextMarker\`做为下次读取的起点。
2. 若想增大返回Object的数目，可以使用\`Marker\`参数分次读取。

#### 扩展参数

用户可以通过设置\`listObjects\`的第二个参数来完成更强大的功能，如下代码所示：

\`\`\`js
// 设置参数
var options = {
    delimiter: '/',
    marker: '123'
};

client.listObjects(<bucketName>, options)
    .then(function (response) {
        var contents = response.body.contents;
        for (var i = 0, l = contents.length; i < l; i++) {
            console.log(contents[i].key);
        }
    })
    .catch(function (error) {
        // 查询失败
    });
\`\`\`

上面代码在调用\`listObject\`时，指定了\`delimiter\`和\`marker\`两个配置项，以实现更丰富的功能，下表列出了所有可设置的配置名称和作用：

名称|作用
---|---
\`delimiter\`|是一个用于对Object名字进行分组的字符。所有名字包含指定的前缀且第一次出现delimiter字符之间的Object作为一组元素: \`commonPrefixes\`。
\`marker\`|设定结果从\`marker\`之后按字母排序的第一个开始返回。
\`maxKeys\`|限定此次返回Object的最大数，此数值不能超过1000，如果不设定，默认为1000。
\`prefix\`|限定返回的Object Key必须以\`prefix\`作为前缀。

注意：

1. 如果有Object以\`prefix\`命名，当仅使用\`prefix\`查询时，返回的所有Key中仍会包含以\`prefix\`命名的Object

2. 如果有Object以\`prefix\`命名，当使用\`prefix\`和\`delimiter\`组合查询时，返回的所有Key中会有\`null\`，Key的名字不包含\`prefix\`前缀

#### 文件夹功能模拟

用户可以通过\`delimiter\`和\`prefix\`配置项配合进行文件夹功能模拟。

假设Bucket中有5个文件：bos.jpg，fun/，fun/test.jpg，fun/movie/001.avi，fun/movie/007.avi，把 “/” 符号作为文件夹的分隔符。

##### 递归列出目录下所有文件

可以通过设置\`prefix\`配置项来获取某个目录下所有的文件：

\`\`\`js
// 设置参数
var options = {
    prefix: 'fun/' // 递归列出fun目录下的所有文件
};


client.listObjects(<bucketName>, options)
    .then(function (response) {
        console.log('Objects:');
        var contents = response.body.contents;
        for (var i = 0, l = contents.length; i < l; i++) {
            console.log(contents[i].key);
        }
    })
    .catch(function (error) {
        // 查询失败
    });
\`\`\`

输出：

\`\`\`
Objects:
fun/
fun/movie/001.avi
fun/movie/007.avi
fun/test.jpg
\`\`\`

##### 查看目录下的文件和子目录

在\`prefix\`和\`delimiter\`结合的情况下，可以列出目录下的文件和子目录：

\`\`\`js
// 设置参数
var options = {
    prefix: 'fun/', // 列出fun目录下的所有文件和文件夹
    delimiter: '/' // "/" 为文件夹的分隔符
};

client.listObjects(<bucketName>, options)
    .then(function (response) {
        console.log('Objects:');
        var contents = response.body.contents;
        for (var i = 0, l = contents.length; i < l; i++) {
            console.log(contents[i].key);
        }
        console.log('CommonPrefixs:');
        var commonPrefixes = response.body.commonPrefixs;
        for (i = 0, l = commonPrefixes.length; i < l; i++) {
            console.log(commonPrefixes[i]);
        }
    })
    .catch(function (error) {
        // 查询失败
    });
\`\`\`

输出：

\`\`\`
Objects:
fun/
fun/test.jpg
CommonPrefixs:
fun/movie/
\`\`\`

返回的结果中，\`response.body.contents\`给出的是fun目录下的文件。而\`response.body.commonPrefixs\`的列表中给出的是fun目录下的所有子文件夹。可以看出 fun/movie/001.avi ， fun/movie/007.avi 两个文件并没有被列出来，因为它们属于fun文件夹下的movie目录。

### 获取Object（仅支持nodejs）

用户可以通过如下代码将Object读取到一个流中：

\`\`\`js
var range = '0-100';
client.getObject(<bucketName>, <key>, range)
    .then(function (response) {
        var buffer = response.body;
    });
\`\`\`

设置range为0-100表示只获取0到100字节的数据，用户可以用此功能实现文件的分段下载和断点续传。如果不设置range，刚获取整个Object。

### 获取Object到文件（仅支持nodejs）

用户可以通过如下代码将Object下载到一个文件中：

\`\`\`js
var range = '0-100';
client.getObjectToFile(<bucketName>, <key>, <filePath>, range)
    .then(function () {
        // 下载完成
    });
\`\`\`

range的用法同上。

### 获取Object的自定义Meta信息

通过getObjectMetadata方法可以只获取ObjectMetadata而不获取Object的实体。如下代码所示：

\`\`\`js
client.getObjectMetadata(<bucketName>, <key>)
    .then(function (response) {
        console.dir(response.http_headers);
    });
\`\`\`

### 删除Object

如下代码删除了一个Object:

\`\`\`js
client.deleteObject(<bucketName>, <key>);
\`\`\`

### 拷贝Object

用户可以通过copyObjectRequest实现Object的拷贝，如下代码所示：

\`\`\`js
var options = {
    x-bce-meta-foo1: 'bar1', // 覆盖自定义meta信息
    x-bce-meta-foo2: 'bar2', // 覆盖自定义meta信息
    x-bce-meta-foo3: 'bar3' // 覆盖自定义meta信息
}
client.copyObject(<bucketName>, <key>, <targetBucketName>, <targetKey>, options);
\`\`\`
`
var Post = React.createClass({
  statics: {
    content: content
  },
  render: function() {
    return <Layout metadata={{"id":"api-reference-bos","title":"BOS - api","layout":"docs","category":"API Reference","next":"api-reference-vod","permalink":"docs/api-reference-bos.html"}}>{content}</Layout>;
  }
});
module.exports = Post;

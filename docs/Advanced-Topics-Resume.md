---
id: advanced-topics-resume
title: 分块上传进阶 - “断点续传”
layout: docs
category: Advanced Topics
next: advanced-topics-uploader
permalink: docs/advanced-topics-resume.html
---

在[大文件分块上传](advanced-topics-multiupload.html)中，我们演示了如何使用文件分块上传，以提升应用的性能和稳定性。但用户在使用浏览器上传文件到BOS的时候，有可能会遇到页面关闭、浏览器崩溃、网络连接中断等问题，从面导致上传失败。如果用户上传失败了，似乎只能下次重新从头开始上传，这无疑是令人沮丧的，特别是当用户在上传大文件的时候。

在这篇文档中，我们将对[大文件分块上传](advanced-topics-multiupload.html)文档中的示例程序进行一点改进，让它具备“断点上传”的能力。

### 实现原理

在我们使用文件分块上传（multipartUpload）的时候，BOS首先会为这个上传过程分配一个`uploadId`。然后我们将一个文件被分成了若干part，每个part独立上传，上传完成后，BOS 服务会为这个part生成一个`eTag`。当所有part都上传完成的时候，BOS 服务根据这些`eTag`和`uploadId`把正确的part找出来，并组合成原本的文件。

在这个过程中，BOS 并不需要所有的part一下子全部上传完毕，而是可以分多次进行。这也就是就，上传过程中，当页面意外关闭时，我们可以不必从头开始重新上传，而只需要把未上传成功的part的再次上传就可以。当然，前提是我们需要把此次上传的`uploadId`和上传完成的part的`etag`保存下来（不过，更推荐的做法是通过[`listParts`](advanced-topics-multiupload.html#%E8%8E%B7%E5%8F%96%E6%89%80%E6%9C%89%E5%B7%B2%E4%B8%8A%E4%BC%A0%E7%9A%84%E5%9D%97%E4%BF%A1%E6%81%AF)接口来查询更精确的已上传分块信息）。在上传一个part之前，可以先检查一下，这个part是否已经上传过了，如果以前已上传成功，那就直接跳过这个part的上传过程。

对于`uploadId`的存储，需要满足不受页面关闭的影响，比较理想的做法是存储在localStorage中。

### 本地存储

在保存`uploadId`时，我们需要为它指定一个key，让不同的文件、不同的上传过程区分开。本示例采用文件名、文件大小、分区大小、bucket名称、object名称组合成这个key：

```js
var generateLocalKey = function (blob, chunkSize, bucket, object) {
    return [blob.name, blob.size, chunkSize, bucket, object].join('&');
};
```

> 注意：
> 用这个方式生成的key并不准确，如果两次上传过程中，选择了两个文件名相同、文件大小相同，但内容不同的文件，那么用这样的方式并不能正确区分这两个文件。更严谨的方式是根据文件名和文件内容计算MD5，并以此为key。

存储方式我们选择localStorage：

```js
var getUploadId = function (key) {
    return localStorage.getItem(key);
};

var setUploadId = function (key, uploadId) {
    return localStorage.setItem(key, uploadId);
};

var removeUploadId = function (key) {
    return localStorage.removeItem(key);
};

```

### 初始化分块上传

在初始化分块上传时，有两种可能：

* 如果已经存在此文件的`uploadId`，那么跳过`initiateMultipartUpload()`方法，改为调用`listParts()`来获取已上传分块信息；
* 如果没有此文件的`uploadId`，那么调用`initiateMultipartUpload()`方法获得新的`uploadId`，并将这个`uploadId`保存在localStorage中。

```js
// ...省略BosClient初始化过程
// var bosClient = new BosClient(bosConfig);

var initiateMultipartUpload = function (file, chunkSize, bucket, object) {
    // 根据文件生成localStorage的key
    var key = generateLocalKey(file, chunkSize, bucket, object);

    // 获取对应的`uploadId`
    var uploadId = getUploadId(key);

    if (uploadId) {
        // `uploadId`存在，说明有未完成的分块上传。
        // 那么调用`listParts()`获取已上传分块信息。
        return bosClient.listParts(bucket, object, uploadId)
            .then(function (response) {
                // response.body.parts里包含了已上传分块的信息
                response.body.uploadId = uploadId;
                return response;
            });
    }
    else {
        // `uploadId`不存在，那么用正常的流程初始化
        return bosClient.initiateMultipartUpload(bucket, object)
            .then(function (response) {
                // response.body.uploadId为新生成的`uploadId`
                response.body.parts = [];

                // 为了下次能使用断点续传，我们需要把新生成的`uploadId`保存下来
                setUploadId(key, response.body.uploadId);
                return response;
            });
    }
}
```

### 分块上传

在对大文件分割分块时，我们可以跟以上传的分块列表进行比较，以确定是否需要真的进行上传。

```js
function getEtag(partNumber, parts){
    // 从已上传part列表中找出特定partNumber的part的eTag
    for(var i = 0, l = parts.length; i < l; i++){
        if (parts[i].partNumber === partNumber) {
            return parts[i].eTag;
        }
    }
    return null;
}

function getTasks (file, uploadId, chunkSize, bucket, object, parts) {
    var leftSize = file.size;
    var offset = 0;
    var partNumber = 1;

    var tasks = [];

    while (leftSize > 0) {
        var partSize = Math.min(leftSize, chunkSize);
        var task = {
            file: file,
            uploadId: uploadId,
            bucket: bucket,
            object: object,
            partNumber: partNumber,
            partSize: partSize,
            start: offset,
            stop: offset + partSize - 1
        };

        // 如果在已上传完成的分块列表中找到这个分块的etag，那么记录下来
        var etag = getEtag(partNumber, parts);
        if (etag){
            task.etag = etag;
        }

        tasks.push(task);

        leftSize -= partSize;
        offset += partSize;
        partNumber += 1;
    }

    return tasks;
}
```

在进行分块上传处理的时候，根据是否已带有`etag`字段来决定是否需要上传：

```js
function uploadPartFile(state, bosClient) {
    return function (task, callback) {
        if (task.etag) {
            // 如果有etag字段，则直接跳过上传
            callback(null, {
                http_headers: {
                    etag: task.etag
                },
                body: {}
            });
        }
        else {
            // 否则进行上传
            var blob = task.file.slice(task.start, task.stop + 1);
            bosClient.uploadPartFromBlob(task.bucket, task.object, task.uploadId, task.partNumber, task.partSize, blob)
                .then(function (res) {
                    ++state.loaded;
                    callback(null, res);
                })
                .catch(function (err) {
                    callback(err);
                });
        }
    };
}
```

### 流程代码

我们对每个步骤的代码做了一些小修改，但整个流程的代码与分块上传很类似：

```js
var chunkSize = 5 * 1024 * 1024; // 分块大小
var uploadId;
initiateMultipartUpload(file, chunkSize, bucket, object)
    .then(function (response) {
        uploadId = response.body.uploadId; // uploadId，可能是服务器刚刚生成的，也可能是从localStorage获取的
        var parts = response.body.parts || []; // 已上传的分块列表。如果是新上传，则为空数组

        var deferred = sdk.Q.defer();
        var tasks = getTasks(blob, uploadId, chunkSize, bucket, object, parts);
        var state = {
            lengthComputable: true,
            loaded: parts.length, // 已上传的分块数
            total: tasks.length
        };

        // 如果已上传的分块数大于0，可以先修改一下文件上传进度
        bosClient.emit('progress', state);

        // 为了管理分块上传，使用了async（https://github.com/caolan/async）库来进行异步处理
        var THREADS = 2; // 同时上传的分块数量
        async.mapLimit(tasks, THREADS, uploadPartFile(state, bosClient), function (err, results) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(results);
            }
        });
        return deferred.promise;
    })
    .then(function (allResponse) {
        var partList = [];
        allResponse.forEach(function (response, index) {
            // 生成分块清单
            partList.push({
                partNumber: index + 1,
                eTag: response.http_headers.etag
            });
        });

        // 所有分块上传完成后，可以删除对应的`uploadId`了
        removeUploadId(key, uploadId);

        return bosClient.completeMultipartUpload(bucket, object, uploadId, partList); // 完成上传
    })
    .then(function (res) {
        // 上传完成
    })
    .catch(function (err) {
        // 上传失败，添加您的代码
        console.error(err);
    });
```

/**
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * @file src/helper.js
 * @author leeight
 */
var fs = require('fs');
var stream = require('stream');

var async = require('async');
var u = require('underscore');
var Q = require('q');
var debug = require('debug')('bce-sdk:helper');

// 超过这个限制就开始分片上传
var MIN_MULTIPART_SIZE = 5 * 1024 * 1024;   // 5M

// 分片上传的时候，每个分片的大小
var PART_SIZE = 1 * 1024 * 1024;   // 1M

var DATA_TYPE_FILE = 1;
var DATA_TYPE_BUFFER = 2;
var DATA_TYPE_STREAM = 3;
var DATA_TYPE_BLOB = 4;

var strategies = {};
var choosenKey = 'default';
strategies.default = {};
/**
 * 自适应的按需上传文件
 *
 * @param {BosClient} client The bos client instance.
 * @param {string} service service name.
 * @param {string} resourceId resource id of specific service.
 * @param {string} bucket The bucket name.
 * @param {string} object The object name.
 * @param {Blob|Buffer|stream.Readable|string} data The data.
 * @param {Object} options The request options.
 * @return {Promise}
 */
strategies.default.upload = function (client, service, resourceId, bucket, object, data, options) {
    var contentLength = 0;
    var dataType = -1;
    if (typeof data === 'string') {
        // 文件路径
        // TODO 如果不存在的话，会抛异常，导致程序退出？
        contentLength = fs.lstatSync(data).size;
        dataType = DATA_TYPE_FILE;
    }
    else if (Buffer.isBuffer(data)) {
        // Buffer
        contentLength = data.length;
        dataType = DATA_TYPE_BUFFER;
    }
    else if (data instanceof stream.Readable) {
        dataType = DATA_TYPE_STREAM;
    }
    else if (typeof Blob !== 'undefined' && data instanceof Blob) {
        // 浏览器里面的对象
        contentLength = data.size;
        dataType = DATA_TYPE_BLOB;
    }

    if (dataType === -1) {
        throw new Error('Unsupported `data` type.');
    }

    if (dataType === DATA_TYPE_STREAM) {
        // XXX options['Content-Length'] 应该呗设置过了吧？
        // 这种情况无法分片上传，只能直传了
        return client.putObject(bucket, object, data, options);
    }
    else if (contentLength <= MIN_MULTIPART_SIZE) {
        if (dataType === DATA_TYPE_FILE) {
            return client.putObjectFromFile(bucket, object, data, options);
        }
        else if (dataType === DATA_TYPE_BUFFER) {
            return client.putObject(bucket, object, data, options);
        }
        else if (dataType === DATA_TYPE_BLOB) {
            return client.putObjectFromBlob(bucket, object, data, options);
        }
    }
    else if (contentLength > MIN_MULTIPART_SIZE) {
        // 开始分片上传
        debug('%s > %s -> multi-part', contentLength, MIN_MULTIPART_SIZE);
        return uploadViaMultipart(client, data, dataType,
            bucket, object, contentLength, PART_SIZE, options);
    }
};

strategies.default.beforeUpload = function () {
    return false;
};

strategies.default.afterUpload = function () {
    return false;
};

/*eslint-disable*/
/**
 * 自适应的按需上传文件
 *
 * @param {BosClient} client The bos client instance.
 * @param {string|Buffer|Blob} data The uploaded content.
 * @param {number} dataType The body data type.
 * @param {string} bucket The bucket name.
 * @param {string} object The object name.
 * @param {number} size The body size.
 * @param {number} partSize The multi-part size.
 * @param {Object} options The request options.
 * @return {Promise}
 */
function uploadViaMultipart(client, data, dataType, bucket, object, size, partSize, options) {
    var uploadId;

    return client.initiateMultipartUpload(bucket, object, options)
        .then(function (response) {
            uploadId = response.body.uploadId;
            debug('initiateMultipartUpload = %j', response);

            var deferred = Q.defer();
            var tasks = getTasks(data, uploadId, bucket, object, size, partSize);
            var state = {
                lengthComputable: true,
                loaded: 0,
                total: tasks.length
            };
            async.mapLimit(tasks, 2, uploadPart(client, dataType, state), function (error, results) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    deferred.resolve(results);
                }
            });
            return deferred.promise;
        })
        .then(function (responses) {
            var parts = u.map(responses, function (response, index) {
                return {
                    partNumber: index + 1,
                    eTag: response.http_headers.etag
                };
            });
            debug('parts = %j', parts);
            return client.completeMultipartUpload(bucket, object, uploadId, parts);
        });
}
/*eslint-enable*/

function uploadPart(client, dataType, state) {
    return function (task, callback) {
        var resolve = function (response) {
            ++state.loaded;
            client.emit('progress', state);
            callback(null, response);
        };
        var reject = function (error) {
            callback(error);
        };

        if (dataType === DATA_TYPE_FILE) {
            debug('client.uploadPartFromFile(%j)', u.omit(task, 'data'));
            return client.uploadPartFromFile(task.bucket, task.object,
                task.uploadId, task.partNumber, task.partSize,
                task.data, task.start).then(resolve, reject);
        }
        else if (dataType === DATA_TYPE_BUFFER) {
            // 没有直接 uploadPartFromBuffer 的接口，借用 DataUrl
            debug('client.uploadPartFromDataUrl(%j)', u.omit(task, 'data'));
            var dataUrl = task.data.slice(task.start, task.stop + 1).toString('base64');
            return client.uploadPartFromDataUrl(task.bucket, task.object,
                task.uploadId, task.partNumber, task.partSize,
                dataUrl).then(resolve, reject);
        }
        else if (dataType === DATA_TYPE_BLOB) {
            debug('client.uploadPartFromBlob(%j)', u.omit(task, 'data'));
            var blob = task.data.slice(task.start, task.stop + 1);
            return client.uploadPartFromBlob(task.bucket, task.object,
                task.uploadId, task.partNumber, task.partSize,
                blob).then(resolve, reject);
        }
    };
}

function getTasks(data, uploadId, bucket, object, size, partSize) {
    var leftSize = size;
    var offset = 0;
    var partNumber = 1;

    var tasks = [];
    while (leftSize > 0) {
        /*eslint-disable*/
        var _partSize = Math.min(leftSize, partSize);
        /*eslint-enable*/
        tasks.push({
            data: data,   // Buffer or Blob
            uploadId: uploadId,
            bucket: bucket,
            object: object,
            partNumber: partNumber,
            partSize: _partSize,
            start: offset,
            stop: offset + _partSize - 1
        });

        leftSize -= _partSize;
        offset += _partSize;
        partNumber += 1;
    }

    return tasks;
}

function pickStrategy(key) {
    var strategy = strategies[key] || strategies.default;
    if (!strategy) {
        throw new Error('upload strategy missing.');
    }
    return strategy;
}

exports.upload = function () {
    var args = [].slice.call(arguments, 0);
    var strategy = pickStrategy(choosenKey);
    return strategy.upload.apply(null, args);
};

exports.beforeUpload = function () {
    var args = [].slice.call(arguments, 0);
    var strategy = pickStrategy(choosenKey);
    return strategy.beforeUpload.apply(null, args);
};

exports.afterUpload = function () {
    var args = [].slice.call(arguments, 0);
    var strategy = pickStrategy(choosenKey);
    return strategy.afterUpload.apply(null, args);
};

exports.setStrategy = function (key, strategy, isChoose) {
    strategies[key] = strategy;
    if (isChoose) {
        choosenKey = key
    }
};

exports.chooseStrategy = function (key) {
    choosenKey = key;
};

/* vim: set ts=4 sw=4 sts=4 tw=120: */

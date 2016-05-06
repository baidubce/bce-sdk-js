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

/* eslint max-params:[0,10] */

import fs from 'fs';
import stream from 'stream';

import async from 'async';
import u from 'underscore';
import Q from 'q';
import _debug from 'debug';

const debug = _debug('bce-sdk:helper');

// 超过这个限制就开始分片上传
const MIN_MULTIPART_SIZE = 5 * 1024 * 1024;   // 5M

// 分片上传的时候，每个分片的大小
const PART_SIZE          = 1 * 1024 * 1024;   // 1M

const DATA_TYPE_FILE     = 1;
const DATA_TYPE_BUFFER   = 2;
const DATA_TYPE_STREAM   = 3;
const DATA_TYPE_BLOB     = 4;

/**
 * 自适应的按需上传文件
 *
 * @param {BosClient} client The bos client instance.
 * @param {string} bucket The bucket name.
 * @param {string} object The object name.
 * @param {Blob|Buffer|stream.Readable|string} data The data.
 * @param {Object} options The request options.
 * @return {Promise}
 */
export let upload = (client, bucket, object, data, options) => {
    let contentLength = 0;
    let dataType = -1;
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

function uploadViaMultipart(client, data, dataType, bucket, object, size, partSize, options) {
    let uploadId;

    return client.initiateMultipartUpload(bucket, object, options)
        .then(response => {
            uploadId = response.body.uploadId;
            debug('initiateMultipartUpload = %j', response);

            let deferred = Q.defer();
            let tasks = getTasks(data, uploadId, bucket, object, size, partSize);
            let state = {
                lengthComputable: true,
                loaded: 0,
                total: tasks.length
            };
            async.mapLimit(tasks, 2, uploadPart(client, dataType, state), (error, results) => {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    deferred.resolve(results);
                }
            });
            return deferred.promise;
        })
        .then(responses => {
            let parts = u.map(responses, (response, index) => {
                return {
                    partNumber: index + 1,
                    eTag: response.http_headers.etag
                };
            });
            debug('parts = %j', parts);
            return client.completeMultipartUpload(bucket, object, uploadId, parts);
        });
}

function uploadPart(client, dataType, state) {
    return (task, callback) => {
        let resolve = response => {
            ++state.loaded;
            client.emit('progress', state);
            callback(null, response);
        };
        let reject = error => callback(error);

        if (dataType === DATA_TYPE_FILE) {
            debug('client.uploadPartFromFile(%j)', u.omit(task, 'data'));
            return client.uploadPartFromFile(task.bucket, task.object,
                task.uploadId, task.partNumber, task.partSize,
                task.data, task.start).then(resolve, reject);
        }
        else if (dataType === DATA_TYPE_BUFFER) {
            // 没有直接 uploadPartFromBuffer 的接口，借用 DataUrl
            debug('client.uploadPartFromDataUrl(%j)', u.omit(task, 'data'));
            let dataUrl = task.data.slice(task.start, task.stop + 1).toString('base64');
            return client.uploadPartFromDataUrl(task.bucket, task.object,
                task.uploadId, task.partNumber, task.partSize,
                dataUrl).then(resolve, reject);
        }
        else if (dataType === DATA_TYPE_BLOB) {
            debug('client.uploadPartFromBlob(%j)', u.omit(task, 'data'));
            let blob = task.data.slice(task.start, task.stop + 1);
            return client.uploadPartFromBlob(task.bucket, task.object,
                task.uploadId, task.partNumber, task.partSize,
                blob).then(resolve, reject);
        }
    };
}

function getTasks(data, uploadId, bucket, object, size, partSize) {
    let leftSize = size;
    let offset = 0;
    let partNumber = 1;

    let tasks = [];
    while (leftSize > 0) {
        /*eslint-disable*/
        let _partSize = Math.min(leftSize, partSize);
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

export let guessContentLength = data => {
    if (data == null) {
        return 0;
    }
    else if (typeof data === 'string') {
        return Buffer.byteLength(data);
    }
    else if (Buffer.isBuffer(data)) {
        return data.length;
    }
    else if (typeof data === 'object') {
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            return data.size;
        }
        if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
            return data.byteLength;
        }
    }

    throw new Error('No Content-Length is specified.');
};

export let fixHeaders = headers => {
    let fixedHeaders = {};

    if (headers) {
        Object.keys(headers).forEach(key => {
            let value = headers[key].trim();
            if (value) {
                key = key.toLowerCase();
                if (key === 'etag') {
                    value = value.replace(/"/g, '');
                }
                fixedHeaders[key] = value;
            }
        });
    }

    return fixedHeaders;
};

export let isXHR2Compatible = obj => {
    if (typeof Blob !== 'undefined' && obj instanceof Blob) {
        return true;
    }

    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) {
        return true;
    }

    if (typeof FormData !== 'undefined' && obj instanceof FormData) {
        return true;
    }

    return false;
};











/* vim: set ts=4 sw=4 sts=4 tw=120: */

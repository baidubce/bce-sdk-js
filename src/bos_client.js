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
 * @file src/bos_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

import util from 'util';
import path from 'path';
import fs from 'fs';
import qs from 'querystring';
import url from 'url';

import u from 'underscore';
import Q from 'q';

import * as H from './headers';
import strings from './strings';
import Auth from './auth';
import crypto from './crypto';
import HttpClient from './http_client';
import BceBaseClient from './bce_base_client';
import MimeType from './mime.types';
import WMStream from './wm_stream';
import Multipart from './multipart';

// let MIN_PART_SIZE = 1048576;                // 1M
// let THREAD = 2;
const MAX_PUT_OBJECT_LENGTH = 5368709120;     // 5G
const MAX_USER_METADATA_SIZE = 2048;          // 2 * 1024
const MIN_PART_NUMBER = 1;
const MAX_PART_NUMBER = 10000;
const COMMAND_MAP = {
    scale: 's',
    width: 'w',
    height: 'h',
    quality: 'q',
    format: 'f',
    angle: 'a',
    display: 'd',
    limit: 'l',
    crop: 'c',
    offsetX: 'x',
    offsetY: 'y',
    watermark: 'wm',
    key: 'k',
    gravity: 'g',
    gravityX: 'x',
    gravityY: 'y',
    opacity: 'o',
    text: 't',
    fontSize: 'sz',
    fontFamily: 'ff',
    fontColor: 'fc',
    fontStyle: 'fs'
};
const IMAGE_DOMAIN = 'bceimg.com';

export default class BosClient extends BceBaseClient {
    constructor(config) {
        super(config, 'bos', true);
        this._httpAgent = null;
    }

    // --- B E G I N ---
    generatePresignedUrl(bucketName, key, timestamp = new Date(), expirationInSeconds = 1800,
        headers = {}, params = {}, headersToSign = {}, config) {
        config = u.extend({}, this.config, config);

        let resource = path.normalize(path.join(
            '/v1',
            strings.normalize(bucketName || ''),
            strings.normalize(key || '', false)
        )).replace(/\\/g, '/');

        headers.Host = url.parse(config.endpoint).host;

        let credentials = config.credentials;
        let auth = new Auth(credentials.ak, credentials.sk);
        let authorization = auth.generateAuthorization(
            'GET', resource, params, headers, timestamp, expirationInSeconds,
            headersToSign);

        params.authorization = authorization;

        return util.format('%s%s?%s', config.endpoint, resource, qs.encode(params));
    }

    generateUrl(bucketName, key, pipeline, cdn) {
        let resource = path.normalize(path.join(
            '/v1',
            strings.normalize(bucketName || ''),
            strings.normalize(key || '', false)
        )).replace(/\\/g, '/');

        // pipeline表示如何对图片进行处理.
        let command = '';
        if (pipeline) {
            if (u.isString(pipeline)) {
                if (/^@/.test(pipeline)) {
                    command = pipeline;
                }
                else {
                    command = '@' + pipeline;
                }
            }
            else {
                command = '@' + u.map(pipeline, function (params) {
                        return u.map(params, function (value, key) {
                            return [COMMAND_MAP[key] || key, value].join('_');
                        }).join(',');
                    }).join('|');
            }
        }
        if (command) {
            // 需要生成图片转码url
            if (cdn) {
                return util.format('http://%s/%s%s', cdn, path.normalize(key), command);
            }
            return util.format('http://%s.%s/%s%s', path.normalize(bucketName), IMAGE_DOMAIN, path.normalize(key), command);
        }
        return util.format('%s%s%s', this.config.endpoint, resource, command);
    }

    listBuckets(options = {}) {
        return this.sendRequest('GET', {config: options.config});
    }

    createBucket(bucketName, options = {}) {
        return this.sendRequest('PUT', {
            bucketName,
            config: options.config
        });
    }

    listObjects(bucketName, options = {}) {
        let params = u.extend(
            {maxKeys: 1000},
            u.pick(options, 'maxKeys', 'prefix', 'marker', 'delimiter')
        );

        return this.sendRequest('GET', {
            bucketName, params,
            config: options.config
        });
    }

    doesBucketExist(bucketName, options = {}) {
        return this.sendRequest('HEAD', {
            bucketName, config: options.config
        }).then(
            () => true,
            e => {
                if (e && e[H.X_STATUS_CODE] === 403) {
                    return true;
                }
                if (e && e[H.X_STATUS_CODE] === 404) {
                    return false;
                }
                throw e;
            }
        );
    }

    deleteBucket(bucketName, options = {}) {
        return this.sendRequest('DELETE', {
            bucketName,
            config: options.config
        });
    }

    setBucketCannedAcl(bucketName, cannedAcl, options = {}) {
        let headers = {
            [H.X_BCE_ACL]: cannedAcl
        };
        return this.sendRequest('PUT', {
            bucketName,
            headers,
            params: {acl: ''},
            config: options.config
        });
    }

    setBucketAcl(bucketName, acl, options = {}) {
        let headers = {
            [H.CONTENT_TYPE]:  'application/json; charset=UTF-8'
        };
        return this.sendRequest('PUT', {
            bucketName,
            body: JSON.stringify({accessControlList: acl}),
            headers,
            params: {acl: ''},
            config: options.config
        });
    }

    getBucketAcl(bucketName, options = {}) {
        return this.sendRequest('GET', {
            bucketName,
            params: {acl: ''},
            config: options.config
        });
    }

    getBucketLocation(bucketName, options = {}) {
        return this.sendRequest('GET', {
            bucketName,
            params: {location: ''},
            config: options.config
        });
    }

    deleteMultipleObjects(bucketName, objects, options = {}) {
        let body = u.map(objects, key => {
            return {key};
        });

        return this.sendRequest('POST', {
            bucketName,
            params: {'delete': ''},
            body: JSON.stringify({
                objects: body
            }),
            config: options.config
        });
    }

    deleteObject(bucketName, key, options = {}) {
        return this.sendRequest('DELETE', {
            bucketName,
            key,
            config: options.config
        });
    }

    putObject(bucketName, key, data, options = {}) {
        if (!key) {
            throw new TypeError('key should not be empty.');
        }

        let {headers, config} = this._checkOptions(options);
        let body = data;

        return this.sendRequest('PUT', {
            bucketName, key, body,
            headers, config
        });
    }

    putObjectFromBlob(bucketName, key, blob, options) {
        let headers = u.extend({
            [H.CONTENT_LENGTH]: blob.size
        }, options);

        return this.putObject(bucketName, key, blob, headers);
    }

    putObjectFromDataUrl(bucketName, key, dataUrl, options) {
        let body = new Buffer(dataUrl, 'base64');
        let headers = u.extend({
            [H.CONTENT_LENGTH]: body.length
        }, options);

        return this.putObject(bucketName, key, body, headers);
    }

    putObjectFromString(bucketName, key, data, options = {}) {
        let contentType = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(key));
        let headers = u.extend({
            [H.CONTENT_LENGTH]: Buffer.byteLength(data),
            [H.CONTENT_TYPE]: contentType,
            [H.CONTENT_MD5]: crypto.md5sum(data)
        }, options);

        return this.putObject(bucketName, key, data, headers);
    }

    putObjectFromFile(bucketName, key, filename, options = {}) {
        // 如果没有显式的设置，就使用默认值
        let fileSize = fs.statSync(filename).size;
        let contentLength = u.has(options, H.CONTENT_LENGTH)
            ? options[H.CONTENT_LENGTH]
            : fileSize;
        if (contentLength > fileSize) {
            throw new Error('options[\'Content-Length\'] should less than ' + fileSize);
        }

        let contentType = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(filename));

        let headers = u.extend({
            [H.CONTENT_LENGTH]: contentLength,
            [H.CONTENT_TYPE]: contentType
        }, options);

        let streamOptions = {
            start: 0,
            end: Math.max(0, contentLength - 1)
        };

        let promise = u.has(headers, H.CONTENT_MD5)
            ? headers[H.CONTENT_MD5]
            : Q.fcall(() => {
                let fp = fs.createReadStream(filename, streamOptions);
                return crypto.md5stream(fp);
            });

        return Q.resolve(promise)
            .then(md5sum => {
                headers[H.CONTENT_MD5] = md5sum;

                let fp = fs.createReadStream(filename, streamOptions);
                return this.putObject(bucketName, key, fp, headers);
            });
    }

    getObjectMetadata(bucketName, key, options = {}) {
        return this.sendRequest('HEAD', {
            bucketName,
            key,
            config: options.config
        });
    }

    getObject(bucketName, key, range, options = {}) {
        let outputStream = new WMStream();
        return this.sendRequest('GET', {
            bucketName,
            key,
            headers: {
                Range: range ? util.format('bytes=%s', range) : ''
            },
            config: options.config,
            outputStream
        }).then(response => {
            response.body = outputStream.store;
            return response;
        });
    }

    getObjectToFile(bucketName, key, filename, range, options = {}) {
        return this.sendRequest('GET', {
            bucketName,
            key,
            headers: {
                Range: range ? util.format('bytes=%s', range) : ''
            },
            config: options.config,
            outputStream: fs.createWriteStream(filename)
        });
    }

    copyObject(sourceBucketName, sourceKey, targetBucketName, targetKey, options = {}) {
        /*eslint-disable*/
        if (!sourceBucketName) {
            throw new TypeError('sourceBucketName should not be empty');
        }
        if (!sourceKey) {
            throw new TypeError('sourceKey should not be empty');
        }
        if (!targetBucketName) {
            throw new TypeError('targetBucketName should not be empty');
        }
        if (!targetKey) {
            throw new TypeError('targetKey should not be empty');
        }
        /*eslint-enable*/

        let {headers, config} = this._checkOptions(options);

        let hasUserMetadata = false;
        u.some(headers, (value, key) => {
            if (key.indexOf('x-bce-meta-') === 0) {
                hasUserMetadata = true;
                return true;
            }
        });
        headers['x-bce-copy-source'] = strings.normalize(util.format('/%s/%s',
            sourceBucketName, sourceKey), false);
        if (u.has(headers, 'ETag')) {
            headers['x-bce-copy-source-if-match'] = headers.ETag;
        }
        headers['x-bce-metadata-directive'] = hasUserMetadata ? 'replace' : 'copy';

        return this.sendRequest('PUT', {
            bucketName: targetBucketName,
            key: targetKey,
            headers,
            config
        });
    }

    initiateMultipartUpload(bucketName, key, options = {}) {
        let contentType = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(key));
        let headers = {
            [H.CONTENT_TYPE]: contentType
        };
        return this.sendRequest('POST', {
            bucketName, key,
            params: {uploads: ''},
            headers,
            config: options.config
        });
    }

    abortMultipartUpload(bucketName, key, uploadId, options = {}) {
        return this.sendRequest('DELETE', {
            bucketName, key,
            params: {uploadId},
            config: options.config
        });
    }

    completeMultipartUpload(bucketName, key, uploadId, partList, options = {}) {
        let {headers, config} = this._checkOptions(u.extend({
            [H.CONTENT_TYPE]: 'application/json; charset=UTF-8'
        }, options));

        return this.sendRequest('POST', {
            bucketName, key,
            body: JSON.stringify({parts: partList}),
            params: {uploadId},
            headers, config
        });
    }

    uploadPartFromFile(bucketName, key, uploadId, partNumber, partSize, filename, offset, options = {}) {
        let start = offset;
        let end = offset + partSize - 1;
        let partFp = fs.createReadStream(filename, {start, end});
        return this.uploadPart(bucketName, key, uploadId, partNumber,
            partSize, partFp, options);
    }

    uploadPartFromBlob(bucketName, key, uploadId, partNumber, partSize, blob, options = {}) {
        if (blob.size !== partSize) {
            throw new TypeError(util.format('Invalid partSize %d and data length %d',
                partSize, blob.size));
        }

        let {headers, config} = this._checkOptions(u.extend({
            [H.CONTENT_LENGTH]: partSize,
            [H.CONTENT_TYPE]: 'application/octet-stream'
        }, options));
        return this.sendRequest('PUT', {
            bucketName, key,
            body: blob,
            params: {partNumber, uploadId},
            headers,
            config
        });
    }

    uploadPartFromDataUrl(bucketName, key, uploadId, partNumber, partSize, dataUrl, options = {}) {
        let data = new Buffer(dataUrl, 'base64');
        if (data.length !== partSize) {
            throw new TypeError(util.format('Invalid partSize %d and data length %d',
                partSize, data.length));
        }

        let {headers, config} = this._checkOptions(u.extend({
            [H.CONTENT_LENGTH]: partSize,
            [H.CONTENT_TYPE]: 'application/octet-stream'
        }, options));

        return this.sendRequest('PUT', {
            bucketName, key,
            body: data,
            params: {partNumber, uploadId},
            headers,
            config
        });
    }

    uploadPart(bucketName, key, uploadId, partNumber, partSize, partFp, options) {
        if (!bucketName) {
            throw new TypeError('bucketName should not be empty');
        }
        if (!key) {
            throw new TypeError('key should not be empty');
        }
        if (partNumber < MIN_PART_NUMBER || partNumber > MAX_PART_NUMBER) {
            throw new TypeError(util.format('Invalid partNumber %d. The valid range is from %d to %d.',
                partNumber, MIN_PART_NUMBER, MAX_PART_NUMBER));
        }

        options = u.extend({
            [H.CONTENT_LENGTH]: partSize,
            [H.CONTENT_TYPE]: 'application/octet-stream'
        }, options);

        let promise = u.has(options, H.CONTENT_MD5)
            ? options[H.CONTENT_MD5]
            : crypto.md5stream(partFp);

        return Q.resolve(promise)
            .then(md5sum => {
                options[H.CONTENT_MD5] = md5sum;

                // TODO(leeight) 计算md5的时候已经把 partFp 读完了，如何从头再来呢？
                let body = fs.createReadStream(partFp.path, {
                    start: partFp.start,
                    end: partFp.end
                });
                let {headers, config} = this._checkOptions(options);

                return this.sendRequest('PUT', {
                    bucketName, key, body,
                    params: {partNumber, uploadId},
                    headers, config
                });
            });
    }

    listParts(bucketName, key, uploadId, options = {}) {
        if (!uploadId) {
            throw new TypeError('uploadId should not empty');
        }

        let allowedParams = ['maxParts', 'partNumberMarker', 'uploadId'];
        let {params, config} = this._checkOptions(options, allowedParams);
        params.uploadId = uploadId;

        return this.sendRequest('GET', {
            bucketName, key,
            params, config
        });
    }

    listMultipartUploads(bucketName, options = {}) {
        let allowedParams = ['delimiter', 'maxUploads', 'keyMarker', 'prefix', 'uploads'];

        let {params, config} = this._checkOptions(options, allowedParams);
        params.uploads = '';

        return this.sendRequest('GET', {
            bucketName, params, config
        });
    }

    appendObject(bucketName, key, data, offset, options = {}) {
        if (!key) {
            throw new TypeError('key should not be empty.');
        }

        let {headers, config} = this._checkOptions(options);
        let params = {append: ''};
        if (u.isNumber(offset)) {
            params.offset = offset;
        }
        return this.sendRequest('POST', {
            bucketName, key,
            body: data,
            headers, params, config
        });
    }

    appendObjectFromBlob(bucketName, key, blob, offset, options = {}) {
        let defaultHeaders = {
            [H.CONTENT_LENGTH]: blob.size
        };
        let headers = u.extend(defaultHeaders, options);

        return this.appendObject(bucketName, key, blob, offset, headers);
    }

    appendObjectFromDataUrl(bucketName, key, dataUrl, offset, options) {
        let body = new Buffer(dataUrl, 'base64');
        let headers = u.extend({
            [H.CONTENT_LENGTH]: body.length
        }, options);

        return this.appendObject(bucketName, key, body, offset, headers);
    }

    appendObjectFromString(bucketName, key, data, offset, options = {}) {
        let contentType = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(key));
        let headers = u.extend({
            [H.CONTENT_LENGTH]: Buffer.byteLength(data),
            [H.CONTENT_TYPE]: contentType,
            [H.CONTENT_MD5]: crypto.md5sum(data)
        }, options);

        return this.appendObject(bucketName, key, data, offset, headers);
    }

    appendObjectFromFile(bucketName, key, filename, offset, size, options = {}) {
        if (size === 0) {
            return this.appendObjectFromString(bucketName, key, '', offset, options);
        }

        // append的起止位置应该在文件内
        let fileSize = fs.statSync(filename).size;
        if (size + offset > fileSize) {
            throw new Error('Can\'t read the content beyond the end of file.');
        }

        let contentType = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(filename));
        let defaultHeaders = {
            [H.CONTENT_LENGTH]: size,
            [H.CONTENT_TYPE]: contentType
        };
        options = u.extend(defaultHeaders, options);

        let streamOptions = {
            start: offset || 0,
            end: (offset || 0) + size - 1
        };

        let fp = fs.createReadStream(filename, streamOptions);
        let promise = u.has(options, H.CONTENT_MD5)
            ? options[H.CONTENT_MD5]
            : crypto.md5stream(fp);

        return Q.resolve(promise)
            .then(md5sum => {
                options[H.CONTENT_MD5] = md5sum;

                let fp = fs.createReadStream(filename, streamOptions);
                return this.appendObject(bucketName, key, fp, offset, options);
            });
    }

    signPostObjectPolicy(policy) {
        let credentials = this.config.credentials;
        let auth = new Auth(credentials.ak, credentials.sk);

        policy = new Buffer(JSON.stringify(policy)).toString('base64');
        let signature = auth.hash(policy, credentials.sk);

        return {policy, signature};
    }

    postObject(bucketName, key, data, options = {}) {
        let boundary = 'MM8964' + (Math.random() * Math.pow(2, 63)).toString(36);
        let contentType = 'multipart/form-data; boundary=' + boundary;

        if (u.isString(data)) {
            data = fs.readFileSync(data);
        }
        else if (!Buffer.isBuffer(data)) {
            throw new Error('Invalid data type.');
        }

        let credentials = this.config.credentials;
        let ak = credentials.ak;

        let blacklist = ['signature', 'accessKey', 'key', 'file'];
        options = u.omit(options, blacklist);

        let multipart = new Multipart(boundary);
        for (let k in options) {
            if (options.hasOwnProperty(k)) {
                if (k !== 'policy') {
                    multipart.addPart(k, options[k]);
                }
            }
        }

        if (options.policy) {
            let {policy, signature} = this.signPostObjectPolicy(options.policy);
            multipart.addPart('policy', policy);
            multipart.addPart('signature', signature);
        }

        multipart.addPart('accessKey', ak);
        multipart.addPart('key', key);
        multipart.addPart('file', data);

        let body = multipart.encode();

        let headers = {
            [H.CONTENT_TYPE]: contentType
        };

        return this.sendRequest('POST', {bucketName, body, headers});
    }

    // --- E N D ---

    sendRequest(httpMethod, varArgs) {
        let defaultArgs = {
            bucketName: null,
            key: null,
            body: null,
            headers: {},
            params: {},
            config: {},
            outputStream: null
        };
        let args = u.extend(defaultArgs, varArgs);

        let config = u.extend({}, this.config, args.config);
        let resource = path.normalize(path.join(
            '/v1',
            strings.normalize(args.bucketName || ''),
            strings.normalize(args.key || '', false)
        )).replace(/\\/g, '/');

        if (config.sessionToken) {
            args.headers[H.SESSION_TOKEN] = config.sessionToken;
        }

        return this.sendHTTPRequest(httpMethod, resource, args, config);
    }

    sendHTTPRequest(httpMethod, resource, args, config) {
        let agent = this._httpAgent = new HttpClient(config);

        let httpContext = {httpMethod, resource, args, config};
        u.each(['progress', 'error', 'abort'], eventName => {
            agent.on(eventName, evt => this.emit(eventName, evt, httpContext));
        });

        let promise = this._httpAgent.sendRequest(httpMethod, resource, args.body,
            args.headers, args.params, u.bind(this.createSignature, this),
            args.outputStream
        );

        promise.abort = () => {
            if (agent._req && agent._req.xhr) {
                let xhr = agent._req.xhr;
                xhr.abort();
            }
        };

        return promise;
    }

    _checkOptions(options, allowedParams = []) {
        let config = options.config || {};
        let headers = this._prepareObjectHeaders(options);
        let params = u.pick(options, allowedParams);

        return {config, headers, params};
    }

    _prepareObjectHeaders(options) {
        let allowedHeaders = [
            H.CONTENT_LENGTH,
            H.CONTENT_ENCODING,
            H.CONTENT_MD5,
            H.X_BCE_CONTENT_SHA256,
            H.CONTENT_TYPE,
            H.CONTENT_DISPOSITION,
            H.ETAG,
            H.SESSION_TOKEN,
            H.CACHE_CONTROL,
            H.EXPIRES,
            H.X_BCE_OBJECT_ACL,
            H.X_BCE_OBJECT_GRANT_READ
        ];
        let metaSize = 0;
        let headers = u.pick(options, (value, key) => {
            if (allowedHeaders.indexOf(key) !== -1) {
                return true;
            }
            else if (/^x\-bce\-meta\-/.test(key)) {
                metaSize += Buffer.byteLength(key) + Buffer.byteLength('' + value);
                return true;
            }
        });

        if (metaSize > MAX_USER_METADATA_SIZE) {
            throw new TypeError('Metadata size should not be greater than ' + MAX_USER_METADATA_SIZE + '.');
        }

        if (u.has(headers, H.CONTENT_LENGTH)) {
            let contentLength = headers[H.CONTENT_LENGTH];
            if (contentLength < 0) {
                throw new TypeError('content_length should not be negative.');
            }
            else if (contentLength > MAX_PUT_OBJECT_LENGTH) { // 5G
                throw new TypeError('Object length should be less than ' + MAX_PUT_OBJECT_LENGTH
                    + '. Use multi-part upload instead.');
            }
        }

        if (u.has(headers, 'ETag')) {
            let etag = headers.ETag;
            if (!/^"/.test(etag)) {
                headers.ETag = util.format('"%s"', etag);
            }
        }

        if (!u.has(headers, H.CONTENT_TYPE)) {
            headers[H.CONTENT_TYPE] = 'application/octet-stream';
        }

        return headers;
    }
}

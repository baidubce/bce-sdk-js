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
 * @file src/doc_client.js
 * @author guofan
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint fecs-camelcase:[2,{"ignore":["/opt_/"]}] */

import fs from 'fs';
import path from 'path';
import builtinUrl from 'url';

import Q from 'q';
import u from 'underscore';
import _debug from 'debug';

import BosClient from './bos_client';
import BceBaseClient from './bce_base_client';
import * as UploadHelper from './helper';
import crypto from './crypto';

let debug = _debug('bce-sdk:Document');

const DATA_TYPE_FILE     = 1;
const DATA_TYPE_BUFFER   = 2;
const DATA_TYPE_BLOB     = 4;

/**
 * 文档转码任务接口（Job/Transcoding API）
 * http://bce.baidu.com/doc/DOC/API.html#.1D.1E.B0.1E.6C.74.0C.6D.C1.68.D2.57.6F.70.EA.F1
 *
 * @constructor
 * @param {Object} config The doc client configuration.
 * @extends {BceBaseClient}
 */
class Document extends BceBaseClient {
    constructor(config) {
        super(config, 'doc', false);
        this._documentId = null;
    }


    // --- B E G I N ---

    _buildUrl(...extraPaths) {
        let apiVersion = this.config.apiVersion;
        let baseUrl = '/' + apiVersion + '/document';

        if (extraPaths.length) {
            baseUrl += '/' + extraPaths.join('/');
        }

        return baseUrl;
    }

    getId() {
        return this._documentId;
    }

    setId(documentId) {
        this._documentId = documentId;
        return this;
    }

    /**
     * Create a document transfer job from local file, buffer, readable stream or blob.
     *
     * @param {Blob|Buffer|string} data The document data. If the data type
     *   is string, which means the file path.
     * @param {Object=} options The extra options.
     * @return {Promise}
     */
    create(data, options = {}) {
        options = u.extend({meta: {}}, options);
        let dataType = -1;
        let pattern = /^bos:\/\//;

        if (u.isString(data)) {
            if (pattern.test(data)) {
                // createFromBos
                try {
                    let parsed = builtinUrl.parse(data);
                    let bucket = parsed.host;
                    let object = parsed.pathname.substr(1);

                    options = u.extend(options, parsed.query);
                    let title = options.title || path.basename(object);
                    let format = options.format || path.extname(object).substr(1);
                    let notification = options.notification;
                    return this.createFromBos(bucket, object,
                        title, format, notification);
                }
                catch (error) {
                    return Q.reject(error);
                }
            }

            dataType = DATA_TYPE_FILE;
            options.meta.sizeInBytes = fs.lstatSync(data).size;
            options.format = options.format || path.extname(data).substr(1);
            options.title = options.title || path.basename(data, path.extname(data));
        }
        else if (Buffer.isBuffer(data)) {
            if (options.format == null || options.title == null) {
                return Q.reject(new Error('buffer type required options.format and options.title'));
            }
            dataType = DATA_TYPE_BUFFER;
            options.meta.sizeInBytes = data.length;
            // 同步计算 MD5
            options.meta.md5 = options.meta.md5 || crypto.md5sum(data, null, 'hex');
        }
        else if (typeof Blob !== 'undefined' && data instanceof Blob) {
            dataType = DATA_TYPE_BLOB;
            options.meta.sizeInBytes = data.size;
            options.format = options.format || path.extname(data.name).substr(1);
            options.title = options.title || path.basename(data.name, path.extname(data.name));
        }
        else {
            return Q.reject(new Error('Unsupported dataType.'));
        }

        if (!options.title || !options.format) {
            return Q.reject(new Error('`title` and `format` are required.'));
        }

        if (options.meta.md5) {
            return this._doCreate(data, options);
        }

        if (dataType === DATA_TYPE_FILE) {
            return crypto.md5stream(fs.createReadStream(data), 'hex')
                .then(md5 => {
                    options.meta.md5 = md5;
                    return this._doCreate(data, options);
                });
        }
        else if (dataType === DATA_TYPE_BLOB) {
            return crypto.md5blob(data, 'hex')
                .then(md5 => {
                    options.meta.md5 = md5;
                    return this._doCreate(data, options);
                });
        }
        return this._doCreate(data, options);
    }

    _doCreate(data, options) {
        let documentId = null;
        let bucket = null;
        let object = null;
        let bosEndpoint = null;

        return this.register(options)
            .then(response => {
                debug('register[response = %j]', response);

                documentId = response.body.documentId;
                bucket = response.body.bucket;
                object = response.body.object;
                bosEndpoint = response.body.bosEndpoint;

                let bosConfig = u.extend({}, this.config, {endpoint: bosEndpoint});
                let bosClient = new BosClient(bosConfig);

                return UploadHelper.upload(bosClient, bucket, object, data);
            })
            .then(response => {
                debug('upload[response = %j]', response);
                return this.publish();
            })
            .then(response => {
                debug('publish[response = %j]', response);
                response.body = {
                    documentId, bucket, object, bosEndpoint
                };
                return response;
            });
    }

    register(options) {
        debug('register[options = %j]', options);

        let url = this._buildUrl();
        return this.sendRequest('POST', url, {
            params: {register: ''},
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(options)
        }).then(response => {
            this.setId(response.body.documentId);
            return response;
        });
    }

    publish(documentId) {
        let url = this._buildUrl(documentId || this._documentId);
        return this.sendRequest('PUT', url, {
            params: {publish: ''}
        });
    }

    get(documentId) {
        let url = this._buildUrl(documentId || this._documentId);
        return this.sendRequest('GET', url);
    }

    /**
     * Get docId and token to render the document in the browser.
     *
     * ```html
     * <div id="reader"></div>
     * <script src="http://bce.bdstatic.com/doc/doc_reader.js"></script>
     * <script>
     * let host = location.host;
     * let option = {
     *     docId: <docId>,
     *     token: <token>,
     *     host: <host>
     * };
     * new Document('reader', option);
     * </script>
     * ```
     *
     * @param {string} documentId The document Id.
     * @return {Promise}
     */
    read(documentId) {
        let url = this._buildUrl(documentId || this._documentId);
        return this.sendRequest('GET', url, {
            params: {read: ''}
        });
    }

    /**
     * Create document from bos object.
     *
     * 1. The BOS bucket must in bj-region.
     * 2. The BOS bucket permission must be public-read.
     *
     * 用户需要将源文档所在BOS bucket权限设置为公共读，或者在自定义权限设置中为开放云文档转码服务账号
     *（沙盒：798c20fa770840438a29efd66cdccf7f，线上：183db8cd3d5a4bf9a94459f89a7a3a91）添加READ权限。
     *
     * 文档转码服务依赖文档的md5，为提高转码性能，文档转码服务需要用户为源文档指定md5；
     * 因此用户需要在上传文档至BOS时设置自定义meta header x-bce-meta-md5来记录源文档md5。
     * 补充说明：实际上当用户没有为源文档设置x-bce-meta-md5 header时，文档转码服务还会
     * 尝试根据BOS object ETag解析源文档md5，如果解析失败（ETag以'-'开头），才会真正报错。
     *
     * @param {string} bucket The bucket name in bj region.
     * @param {string} object The object name.
     * @param {string} title The document title.
     * @param {string=} format The document extension is possible.
     * @param {string=} notification The notification name.
     * @return {Promise}
     */
    createFromBos(bucket, object, title, format = '', notification = '') {
        let url = this._buildUrl();

        let body = {bucket, object, title};

        if (!format) {
            format = path.extname(object).substr(1);
        }

        if (!format) {
            throw new Error('Document format parameter required');
        }

        body.format = format;
        if (notification) {
            body.notification = notification;
        }

        // debug('createFromBos:arguments = [%j], body = [%j]', arguments, body);
        return this.sendRequest('POST', url, {
            params: {source: 'bos'},
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        }).then(response => {
            this.setId(response.body.documentId);
            return response;
        });
    }

    removeAll() {
        return this.list().then(response => {
            let asyncTasks = (response.body.documents || []).map(
                item => this.remove(item.documentId));
            return Q.all(asyncTasks);
        });
    }

    remove(documentId) {
        let url = this._buildUrl(documentId || this._documentId);
        return this.sendRequest('DELETE', url);
    }

    list(status = '') {
        let url = this._buildUrl();
        return this.sendRequest('GET', url, {
            params: {status}
        });
    }
}

class Notification extends BceBaseClient {
    constructor(config) {
        super(config, 'doc', false);
        this._name = null;
        this._endpoint = null;
    }

    _buildUrl(...extraPaths) {
        let apiVersion = this.config.apiVersion;
        let baseUrl = '/' + apiVersion + '/notification';
        if (extraPaths.length) {
            baseUrl += '/' + extraPaths.join('/');
        }

        return baseUrl;
    }

    create(name, endpoint) {
        let url = this._buildUrl();
        return this.sendRequest('POST', url, {
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, endpoint})
        }).then(response => {
            this._name = name;
            this._endpoint = endpoint;
            return response;
        });
    }

    get(name) {
        let url = this._buildUrl(name || this._name);
        return this.sendRequest('GET', url);
    }

    list() {
        return this.sendRequest('GET', this._buildUrl());
    }

    remove(name) {
        let url = this._buildUrl(name || this._name);
        return this.sendRequest('DELETE', url);
    }

    removeAll() {
        return this.list().then(response => {
            let asyncTasks = (response.body.notifications || []).map(
                item => this.remove(item.name));
            return Q.all(asyncTasks);
        });
    }
}

export default {
    Document,
    Notification
};

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
 * @file src/http_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

import http from 'http';
import https from 'https';
import util from 'util';
import url from 'url';
import querystring from 'querystring';
import stream from 'stream';
import {EventEmitter} from 'events';

import u from 'underscore';
import Q from 'q';
import _debug from 'debug';

import * as H from './headers';
import * as helper from './helper';

const debug = _debug('bce-sdk:HttpClient');

/**
 * The HttpClient
 *
 * @constructor
 * @param {Object} config The http client configuration.
 */
export default class HttpClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this._req = null;
    }

    sendRequest(httpMethod, path, body, headers = {}, params = {}, signFunction = u.noop, outputStream) {
        let requestUrl = this._getRequestUrl(path, params);
        let options = url.parse(requestUrl);
        debug('httpMethod = %s, requestUrl = %s, options = %j', httpMethod, requestUrl, options);

        let userAgent = typeof navigator === 'object'
            ? navigator.userAgent
            : util.format('bce-sdk-js/%s/%s', process.platform, process.version);

        let defaultHeaders = {
            [H.X_BCE_DATE]: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
            [H.CONNECTION]: 'close',
            [H.CONTENT_TYPE]: 'application/json; charset=UTF-8',
            [H.HOST]: options.host,
            [H.USER_AGENT]: userAgent
        };

        headers = u.extend(defaultHeaders, headers);

        if (!headers.hasOwnProperty(H.CONTENT_LENGTH)) {
            let contentLength = helper.guessContentLength(body);
            if (!(contentLength === 0 && /GET|HEAD/i.test(httpMethod))) {
                // 如果是 GET 或 HEAD 请求，并且 Content-Length 是 0，那么 Request Header 里面就不要出现 Content-Length
                // 否则本地计算签名的时候会计算进去，但是浏览器发请求的时候不一定会有，此时导致 Signature Mismatch 的情况
                headers[H.CONTENT_LENGTH] = contentLength;
            }
        }

        options.method = httpMethod;
        options.headers = headers;

        // 通过browserify打包后，在Safari下并不能有效处理server的content-type
        // 参考ISSUE：https://github.com/jhiesey/stream-http/issues/8
        options.mode = 'prefer-fast';

        // rejectUnauthorized: If true, the server certificate is verified against the list of supplied CAs.
        // An 'error' event is emitted if verification fails.
        // Verification happens at the connection level, before the HTTP request is sent.
        options.rejectUnauthorized = false;

        return Q.resolve(signFunction(this.config.credentials, httpMethod, path, params, headers))
            .then((authorization, xbceDate) => {
                if (u.isString(authorization)) {
                    headers[H.AUTHORIZATION] = authorization;
                }

                if (u.isString(xbceDate)) {
                    headers[H.X_BCE_DATE] = xbceDate;
                }

                debug('options = %j', options);
                return this._doRequest(options, body, outputStream);
            });
    }

    _isValidStatus(statusCode) {
        return statusCode >= 200 && statusCode < 300;
    }

    _doRequest(options, body, outputStream) {
        let deferred = Q.defer();
        let network = options.protocol === 'https:' ? https : http;

        let req = network.request(options, res => {
            if (this._isValidStatus(res.statusCode) && outputStream
                && outputStream instanceof stream.Writable) {
                res.pipe(outputStream);
                outputStream.on('finish', () => {
                    deferred.resolve(this.success(helper.fixHeaders(res.headers)));
                });
                outputStream.on('error', error => deferred.reject(error));
                return;
            }
            deferred.resolve(this._recvResponse(res));
        });

        if (req.xhr && typeof req.xhr.upload === 'object') {
            u.each(['progress', 'error', 'abort'], eventName => {
                req.xhr.upload.addEventListener(eventName,
                    evt => this.emit(eventName, evt), false);
            });
        }

        req.on('error', error => deferred.reject(error));

        try {
            this._req = req;
            this._sendRequest(req, body);
        }
        catch (ex) {
            deferred.reject(ex);
        }

        return deferred.promise;
    }

    _sendRequest(req, data) {
        if (!data) {
            req.end();
            return;
        }

        if (typeof data === 'string') {
            data = new Buffer(data);
        }

        if (Buffer.isBuffer(data) || helper.isXHR2Compatible(data)) {
            req.write(data);
            req.end();
        }
        else if (data instanceof stream.Readable) {
            if (!data.readable) {
                throw new Error('stream is not readable');
            }

            data.on('data', chunk => req.write(chunk));
            data.on('end', () => req.end());
        }
        else {
            throw new Error('Invalid body type = ' + typeof data);
        }
    }

    _recvResponse(res) {
        let responseHeaders = helper.fixHeaders(res.headers);
        let statusCode = res.statusCode;

        function parseHttpResponseBody(raw) {
            let contentType = responseHeaders['content-type'];

            if (!raw.length) {
                return {};
            }
            else if (contentType
                && /(application|text)\/json/.test(contentType)) {
                return JSON.parse(raw.toString());
            }
            return raw;
        }

        let deferred = Q.defer();

        let payload = [];
        res.on('data', chunk => {
            if (Buffer.isBuffer(chunk)) {
                payload.push(chunk);
            }
            else {
                // xhr2返回的内容是 string，不是 Buffer，导致 Buffer.concat 的时候报错了
                payload.push(new Buffer(chunk));
            }
        });
        res.on('error', e => deferred.reject(e));
        res.on('end', () => {
            let raw = Buffer.concat(payload);
            let responseBody = null;

            try {
                responseBody = parseHttpResponseBody(raw);
            }
            catch (e) {
                deferred.reject(e);
                return;
            }

            if (statusCode >= 100 && statusCode < 200) {
                deferred.reject(this.failure(statusCode, 'Can not handle 1xx http status code.'));
            }
            else if (statusCode < 100 || statusCode >= 300) {
                if (responseBody.requestId) {
                    deferred.reject(this.failure(statusCode, responseBody.message,
                        responseBody.code, responseBody.requestId));
                }
                else {
                    deferred.reject(this.failure(statusCode, responseBody));
                }
            }

            deferred.resolve(this.success(responseHeaders, responseBody));
        });

        return deferred.promise;
    }

    buildQueryString(params) {
        return querystring.stringify(params);
    }

    _getRequestUrl(path, params) {
        let uri = path;
        let qs = this.buildQueryString(params);
        if (qs) {
            uri += '?' + qs;
        }

        return this.config.endpoint + uri;
    }

    success(httpHeaders, body = {}) {
        return {
            [H.X_HTTP_HEADERS]: httpHeaders,
            [H.X_BODY]: body
        };
    }

    failure(statusCode, message, code, requestId) {
        return {
            [H.X_STATUS_CODE]: statusCode,
            [H.X_MESSAGE]: Buffer.isBuffer(message) ? String(message) : message,
            [H.X_CODE]: code,
            [H.X_REQUEST_ID]: requestId
        };
    }
}



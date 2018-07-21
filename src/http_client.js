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
/* globals ArrayBuffer */

var http = require('http');
var https = require('https');
var util = require('util');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;

var u = require('underscore');
var Q = require('q');
var debug = require('debug')('bce-sdk:HttpClient');

var H = require('./headers');
var Auth = require('./auth');

/**
 * The HttpClient
 *
 * @constructor
 * @param {Object} config The http client configuration.
 */
function HttpClient(config) {
    EventEmitter.call(this);

    this.config = config;

    /**
     * http(s) request object
     * @type {Object}
     */
    this._req = null;
}
util.inherits(HttpClient, EventEmitter);

/**
 * Send Http Request
 *
 * @param {string} httpMethod GET,POST,PUT,DELETE,HEAD
 * @param {string} path The http request path.
 * @param {(string|Buffer|stream.Readable)=} body The request body. If `body` is a
 * stream, `Content-Length` must be set explicitly.
 * @param {Object=} headers The http request headers.
 * @param {Object=} params The querystrings in url.
 * @param {function():string=} signFunction The `Authorization` signature function
 * @param {stream.Writable=} outputStream The http response body.
 * @param {number=} retry The maximum number of network connection attempts.
 *
 * @resolve {{http_headers:Object,body:Object}}
 * @reject {Object}
 *
 * @return {Q.defer}
 */
HttpClient.prototype.sendRequest = function (httpMethod, path, body, headers, params,
                                             signFunction, outputStream) {
    httpMethod = httpMethod.toUpperCase();
    var requestUrl = this._getRequestUrl(path, params);
    var options = require('url').parse(requestUrl);
    debug('httpMethod = %s, requestUrl = %s, options = %j',
        httpMethod, requestUrl, options);

    // Prepare the request headers.
    var defaultHeaders = {};
    if (typeof navigator === 'object') {
        defaultHeaders[H.USER_AGENT] = navigator.userAgent;
    }
    else {
        defaultHeaders[H.USER_AGENT] = util.format('bce-sdk-nodejs/%s/%s/%s', require('../package.json').version,
            process.platform, process.version);
    }
    defaultHeaders[H.X_BCE_DATE] = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    defaultHeaders[H.CONNECTION] = 'close';
    defaultHeaders[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
    defaultHeaders[H.HOST] = options.host;

    headers = u.extend({}, defaultHeaders, headers);

    // if (!headers.hasOwnProperty(H.X_BCE_REQUEST_ID)) {
    //    headers[H.X_BCE_REQUEST_ID] = this._generateRequestId();
    // }

    // Check the content-length
    if (!headers.hasOwnProperty(H.CONTENT_LENGTH)) {
        var contentLength = this._guessContentLength(body);
        if (!(contentLength === 0 && /GET|HEAD/i.test(httpMethod))) {
            // 如果是 GET 或 HEAD 请求，并且 Content-Length 是 0，那么 Request Header 里面就不要出现 Content-Length
            // 否则本地计算签名的时候会计算进去，但是浏览器发请求的时候不一定会有，此时导致 Signature Mismatch 的情况
            headers[H.CONTENT_LENGTH] = contentLength;
        }
    }

    var client = this;
    options.method = httpMethod;
    options.headers = headers;

    // 通过browserify打包后，在Safari下并不能有效处理server的content-type
    // 参考ISSUE：https://github.com/jhiesey/stream-http/issues/8
    options.mode = 'prefer-fast';

    // rejectUnauthorized: If true, the server certificate is verified against the list of supplied CAs.
    // An 'error' event is emitted if verification fails.
    // Verification happens at the connection level, before the HTTP request is sent.
    options.rejectUnauthorized = false;

    if (typeof signFunction === 'function') {
        var promise = signFunction(this.config.credentials, httpMethod, path, params, headers);
        if (isPromise(promise)) {
            return promise.then(function (authorization, xbceDate) {
                headers[H.AUTHORIZATION] = authorization;
                if (xbceDate) {
                    headers[H.X_BCE_DATE] = xbceDate;
                }
                debug('options = %j', options);
                return client._doRequest(options, body, outputStream);
            });
        }
        else if (typeof promise === 'string') {
            headers[H.AUTHORIZATION] = promise;
        }
        else {
            throw new Error('Invalid signature = (' + promise + ')');
        }
    }
    else {
        headers[H.AUTHORIZATION] = createSignature(this.config.credentials, httpMethod, path, params, headers);
    }

    debug('options = %j', options);
    return client._doRequest(options, body, outputStream);
};

function createSignature(credentials, httpMethod, path, params, headers) {
    var auth = new Auth(credentials.ak, credentials.sk);
    return auth.generateAuthorization(httpMethod, path, params, headers);
}

function isPromise(obj) {
    return obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

HttpClient.prototype._isValidStatus = function (statusCode) {
    return statusCode >= 200 && statusCode < 300;
};

HttpClient.prototype._doRequest = function (options, body, outputStream) {
    var deferred = Q.defer();
    var api = options.protocol === 'https:' ? https : http;
    var client = this;

    var req = client._req = api.request(options, function (res) {
        if (client._isValidStatus(res.statusCode) && outputStream
            && outputStream instanceof stream.Writable) {
            res.pipe(outputStream);
            outputStream.on('finish', function () {
                deferred.resolve(success(client._fixHeaders(res.headers), {}));
            });
            outputStream.on('error', function (error) {
                deferred.reject(error);
            });
            return;
        }
        deferred.resolve(client._recvResponse(res));
    });

    if (req.xhr && typeof req.xhr.upload === 'object') {
        u.each(['progress', 'error', 'abort'], function (eventName) {
            req.xhr.upload.addEventListener(eventName, function (evt) {
                client.emit(eventName, evt);
            }, false);
        });
    }

    req.on('error', function (error) {
        deferred.reject(error);
    });

    try {
        client._sendRequest(req, body);
    }
    catch (ex) {
        deferred.reject(ex);
    }
    return deferred.promise;
};

HttpClient.prototype._generateRequestId = function () {
    function chunk() {
        var v = (~~(Math.random() * 0xffff)).toString(16);
        if (v.length < 4) {
            v += new Array(4 - v.length + 1).join('0');
        }
        return v;
    }

    return util.format('%s%s-%s-%s-%s-%s%s%s',
        chunk(), chunk(), chunk(), chunk(),
        chunk(), chunk(), chunk(), chunk());
};

HttpClient.prototype._guessContentLength = function (data) {
    if (data == null) {
        return 0;
    }
    else if (typeof data === 'string') {
        return Buffer.byteLength(data);
    }
    else if (typeof data === 'object') {
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            return data.size;
        }
        if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        if (Buffer.isBuffer(data)) {
            return data.length;
        }
        /**
         if (typeof FormData !== 'undefined' && data instanceof FormData) {
         }
         */
    }
    else if (Buffer.isBuffer(data)) {
        return data.length;
    }

    throw new Error('No Content-Length is specified.');
};

HttpClient.prototype._fixHeaders = function (headers) {
    var fixedHeaders = {};

    if (headers) {
        Object.keys(headers).forEach(function (key) {
            var value = headers[key].trim();
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

HttpClient.prototype._recvResponse = function (res) {
    var responseHeaders = this._fixHeaders(res.headers);
    var statusCode = res.statusCode;

    function parseHttpResponseBody(raw) {
        var contentType = responseHeaders['content-type'];

        if (!raw.length) {
            return {};
        }
        else if (contentType
            && /(application|text)\/json/.test(contentType)) {
            return JSON.parse(raw.toString());
        }
        return raw;
    }

    var deferred = Q.defer();

    var payload = [];
    /* eslint-disable */
    res.on('data', function (chunk) {
        if (Buffer.isBuffer(chunk)) {
            payload.push(chunk);
        }
        else {
            // xhr2返回的内容是 string，不是 Buffer，导致 Buffer.concat 的时候报错了
            payload.push(new Buffer(chunk));
        }
    });
    res.on('error', function (e) {
        deferred.reject(e);
    });
    /* eslint-enable */
    res.on('end', function () {
        var raw = Buffer.concat(payload);
        var responseBody = null;

        try {
            debug('responseHeaders = %j', responseHeaders);
            responseBody = parseHttpResponseBody(raw);
        }
        catch (e) {
            debug('statusCode = %s, Parse response body error = %s', statusCode, e.message);
            deferred.reject(this.failure(statusCode, e.message));
            return;
        }

        if (statusCode >= 100 && statusCode < 200) {
            deferred.reject(failure(statusCode, 'Can not handle 1xx http status code.'));
        }
        else if (statusCode < 100 || statusCode >= 300) {
            if (responseBody.requestId) {
                deferred.reject(failure(statusCode, responseBody.message,
                    responseBody.code, responseBody.requestId));
            }
            else {
                deferred.reject(failure(statusCode, responseBody));
            }
        }

        deferred.resolve(success(responseHeaders, responseBody));
    });

    return deferred.promise;
};

/* eslint-disable */
function isXHR2Compatible(obj) {
    if (typeof Blob !== 'undefined' && obj instanceof Blob) {
        return true;
    }
    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) {
        return true;
    }
    if (typeof FormData !== 'undefined' && obj instanceof FormData) {
        return true;
    }
}
/* eslint-enable */

HttpClient.prototype._sendRequest = function (req, data) {
    /* eslint-disable */
    if (!data) {
        req.end();
        return;
    }
    if (typeof data === 'string') {
        data = new Buffer(data);
    }
    /* eslint-enable */

    if (Buffer.isBuffer(data) || isXHR2Compatible(data)) {
        req.write(data);
        req.end();
    }
    else if (data instanceof stream.Readable) {
        if (!data.readable) {
            throw new Error('stream is not readable');
        }

        data.on('data', function (chunk) {
            req.write(chunk);
        });
        data.on('end', function () {
            req.end();
        });
    }
    else {
        throw new Error('Invalid body type = ' + typeof data);
    }
};

HttpClient.prototype.buildQueryString = function (params) {
    var urlEncodeStr = require('querystring').stringify(params);
    // https://en.wikipedia.org/wiki/Percent-encoding
    return urlEncodeStr.replace(/[()'!~.*\-_]/g, function (char) {
        return '%' + char.charCodeAt().toString(16);
    });
};

HttpClient.prototype._getRequestUrl = function (path, params) {
    var uri = path;
    var qs = this.buildQueryString(params);
    if (qs) {
        uri += '?' + qs;
    }

    return this.config.endpoint + uri;
};

function success(httpHeaders, body) {
    var response = {};

    response[H.X_HTTP_HEADERS] = httpHeaders;
    response[H.X_BODY] = body;

    return response;
}

function failure(statusCode, message, code, requestId) {
    var response = {};

    response[H.X_STATUS_CODE] = statusCode;
    response[H.X_MESSAGE] = Buffer.isBuffer(message) ? String(message) : message;
    if (code) {
        response[H.X_CODE] = code;
    }
    if (requestId) {
        response[H.X_REQUEST_ID] = requestId;
    }

    return response;
}

module.exports = HttpClient;


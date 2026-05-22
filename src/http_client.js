/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/http_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* globals ArrayBuffer */

var process = require('process/'); // use dev dep https://github.com/browserify/browserify/issues/1986
var http = require('http');
var https = require('https');
var util = require('util');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var {HttpsProxyAgent} = require('https-proxy-agent');
var {HttpProxyAgent} = require('http-proxy-agent');

var u = require('underscore');
var Q = require('q');
var debug = require('debug')('bce-sdk:HttpClient');

var H = require('./headers');
var Auth = require('./auth');

/** 是否为浏览器环境 */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
/** 是否为NodeJS环境 */
const isNodeJS = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

/**
 * 类型定义统一来自 `types/` 下的 d.ts，作为单一数据源。
 * 这里仅以 JSDoc `import()` 别名形式引入，便于 JS 内部继续按现有名字使用，
 * 任何字段调整都只需修改 d.ts。
 *
 * @typedef {import('../types').BceClientOptions} BceClientOptions
 * @typedef {import('../types').ProxyConfig} ProxyConfig
 * @typedef {import('../types').SignatureFunction} SignatureFunction
 * @typedef {import('../types').BceClientOptions & import('../types').RequestConfig} HTTPRequestConfig
 */

/**
 * The HttpClient
 *
 * @constructor
 * @param {HTTPRequestConfig} config The http client configuration.
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
 * 基于对象路径更新BceClientOptions中的参数值，注意不要破坏源对象的引用
 *
 * @param {string} path - key路径
 * @param {string} value - 更新后的值
 */
HttpClient.prototype.updateConfigByPath = function (path, value) {
  const pathArr = path.split('.');

  function traverseAndUpdate(currentObj, index) {
    if (index >= pathArr.length - 1) {
      // 到达路径的最后一个属性，设置其值
      currentObj[pathArr[index]] = value;
      return;
    }

    // 如果下一个属性在当前对象中不存在，则创建它
    if (!(pathArr[index] in currentObj)) {
      currentObj[pathArr[index]] = {};
    }

    // 递归遍历到下一个属性
    traverseAndUpdate(currentObj[pathArr[index]], index + 1);
  }

  // 调用辅助函数开始遍历和更新
  traverseAndUpdate(this.config, 0);

  return this.config;
};

/**
 * Send Http Request
 *
 * @param {string} httpMethod GET,POST,PUT,DELETE,HEAD
 * @param {string} path The http request path.
 * @param {(string|Buffer|stream.Readable)=} body The request body. If `body` is a stream, `Content-Length` must be set explicitly.
 * @param {Object=} headers The http request headers.
 * @param {Object=} params The querystrings in url.
 * @param {SignatureFunction=} signFunction The `Authorization` signature function
 * @param {stream.Writable=} outputStream The http response body.
 * @param {number=} retry The maximum number of network connection attempts.
 *
 * @resolve {{http_headers:Object,body:Object}}
 * @reject {Object}
 *
 * @return {Q.defer}
 */
HttpClient.prototype.sendRequest = function (httpMethod, path, body, headers, params, signFunction, outputStream) {
  httpMethod = httpMethod.toUpperCase();
  var requestUrl = this._getRequestUrl(path, params);
  var options = require('url').parse(requestUrl);

  debug('httpMethod = %s, requestUrl = %s, options = %j', httpMethod, requestUrl, options);

  // Prepare the request headers.
  var defaultHeaders = {};
  if (typeof navigator === 'object' && navigator.userAgent) {
    defaultHeaders[H.USER_AGENT] = navigator.userAgent;
  } else {
    defaultHeaders[H.USER_AGENT] = util.format(
      'bce-sdk-nodejs/%s/%s/%s',
      require('../package.json').version,
      process.platform,
      process.version
    );
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
  // 某些产品网关CORS Header `Access-Control-Allow-Origin` 为 `*`, 例如：VOD
  options.withCredentials = false;

  // rejectUnauthorized: If true, the server certificate is verified against the list of supplied CAs.
  // An 'error' event is emitted if verification fails.
  // Verification happens at the connection level, before the HTTP request is sent.
  options.rejectUnauthorized = false;

  if (this.config.signal) {
    options.signal = this.config.signal;
  }

  // 代理服务器配置，仅支持NodeJS环境配置
  if (isNodeJS && this.config.proxy && u.isObject(this.config.proxy)) {
    const {host, port: port} = this.config.proxy;
    /** 代理服务器的协议需要和BOS服务端保持一致 */
    const protocol = ['http', 'https'].includes(this.config.protocol) ? this.config.protocol : 'http';
    const proxyHost = typeof host === 'string' ? host : '';
    const proxyPort =
      typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65536
        ? port
        : protocol === 'https'
        ? 443
        : 80;

    if (proxyHost) {
      const proxyUrl = `${protocol}://${proxyHost}:${proxyPort}`;

      debug('proxyUrl = %j', proxyUrl);

      if (protocol === 'https') {
        options.agent = new HttpsProxyAgent(proxyUrl);
      } else {
        options.agent = new HttpProxyAgent(proxyUrl);
      }
    }
  }

  if (typeof signFunction === 'function') {
    var promise = signFunction(this.config.credentials, httpMethod, path, params, headers, this);
    if (isPromise(promise)) {
      return promise.then(function (authorization, xbceDate) {
        headers[H.AUTHORIZATION] = authorization;
        if (xbceDate) {
          headers[H.X_BCE_DATE] = xbceDate;
        }
        debug('options = %j', options);

        return client._doRequest(options, body, outputStream);
      });
    } else if (typeof promise === 'string') {
      headers[H.AUTHORIZATION] = promise;
    } else {
      throw new Error('Invalid signature = (' + promise + ')');
    }
  } else {
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

/**
 * @typedef {import('url').UrlWithStringQuery} UrlWithStringQuery
 */

/**
 * @param {UrlWithStringQuery} options
 * @param {(string|Buffer|stream.Readable)=} body The request body.
 * @param {stream.Writable} outputStream
 * @returns
 */
HttpClient.prototype._doRequest = function (options, body, outputStream) {
  var deferred = Q.defer();
  var api = options.protocol === 'https:' ? https : http;
  var client = this;
  var signal = options.signal;
  var isAborted = false;

  // ===== HttpObserver 埋点初始化（fast-path: 未配置则零开销） =====
  var observer =
    client.config && typeof client.config.httpObserver === 'function' ? client.config.httpObserver : null;
  var observerContext = client.config && client.config.observerContext ? client.config.observerContext : undefined;
  var requestId = observer ? client._generateRequestId() : null;
  var startedAt = observer ? Date.now() : 0;
  var firstByteAt = 0;
  var bytesSent = 0;
  var bytesReceived = 0;
  var endEmitted = false;

  /**
   * 安全触发观测事件，不允许观察者异常影响主流程
   * @param {string} phase - start | firstByte | end | error | abort
   * @param {Object=} extra - 附加字段（statusCode、ttfbMs、durationMs 等）
   */
  function safeEmit(phase, extra) {
    if (!observer) return;
    try {
      var payload = {
        requestId: requestId,
        phase: phase,
        method: options.method,
        host: options.host || options.hostname,
        path: options.path,
        startedAt: startedAt
      };
      if (observerContext) {
        payload.context = observerContext;
      }
      if (extra) {
        for (var k in extra) {
          if (Object.prototype.hasOwnProperty.call(extra, k) && extra[k] !== undefined) {
            payload[k] = extra[k];
          }
        }
      }
      observer(payload);
    } catch (e) {
      debug('httpObserver threw error: %s', e && e.message);
    }
  }

  if (signal && signal.aborted) {
    var abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    /** 和Node.js中的错误码对齐 */
    abortError.code = 'ABORT_ERR';
    if (observer) {
      safeEmit('abort', {durationMs: 0, errorCode: 'ABORT_ERR'});
    }
    return Q.reject(abortError);
  }

  // start 事件：请求已组装完成、即将发起
  safeEmit('start');

  var req = (client._req = api.request(options, function (res) {
    // firstByte 事件：响应头到达
    if (observer && !firstByteAt) {
      firstByteAt = Date.now();
      safeEmit('firstByte', {ttfbMs: firstByteAt - startedAt, statusCode: res.statusCode});

      // 累积响应体字节数（不影响 _recvResponse 的 data 监听）
      res.on('data', function (chunk) {
        if (chunk && typeof chunk.length === 'number') {
          bytesReceived += chunk.length;
        }
      });
    }

    if (client._isValidStatus(res.statusCode) && outputStream && outputStream instanceof stream.Writable) {
      res.pipe(outputStream);
      outputStream.on('finish', function () {
        if (observer && !endEmitted) {
          endEmitted = true;
          safeEmit('end', {
            statusCode: res.statusCode,
            ttfbMs: firstByteAt ? firstByteAt - startedAt : undefined,
            durationMs: Date.now() - startedAt,
            bytesSent: bytesSent,
            bytesReceived: bytesReceived
          });
        }
        deferred.resolve(success(client._fixHeaders(res.headers), {}));
      });
      outputStream.on('error', function (error) {
        if (observer && !endEmitted) {
          endEmitted = true;
          safeEmit('error', {
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            bytesSent: bytesSent,
            bytesReceived: bytesReceived,
            errorCode: (error && (error.code || error.name)) || 'STREAM_ERROR'
          });
        }
        deferred.reject(error);
      });
      return;
    }

    var recvPromise = client._recvResponse(res);
    if (observer) {
      recvPromise.then(
        function () {
          if (!endEmitted) {
            endEmitted = true;
            safeEmit('end', {
              statusCode: res.statusCode,
              ttfbMs: firstByteAt ? firstByteAt - startedAt : undefined,
              durationMs: Date.now() - startedAt,
              bytesSent: bytesSent,
              bytesReceived: bytesReceived
            });
          }
        },
        function (err) {
          if (!endEmitted) {
            endEmitted = true;
            safeEmit('error', {
              statusCode: (err && err[H.X_STATUS_CODE]) || res.statusCode,
              ttfbMs: firstByteAt ? firstByteAt - startedAt : undefined,
              durationMs: Date.now() - startedAt,
              bytesSent: bytesSent,
              bytesReceived: bytesReceived,
              errorCode: (err && (err[H.X_CODE] || err.code || err.name)) || 'HTTP_ERROR'
            });
          }
        }
      );
    }
    deferred.resolve(recvPromise);
  }));

  // 设置超时10s
  // if (typeof req.setTimeout === 'function') {
  //     req.setTimeout(60e3);

  //     req.on('timeout', function() {
  //         deferred.reject(new Error('socket Timeout!'));

  //         req.destroy();
  //     });
  // } else if (req.xhr) {
  //     req.xhr.timeout = 60e3;
  // }

  /** 监听abort事件 */
  if (signal) {
    var onAbort = function () {
      if (isAborted) return;
      isAborted = true;

      /** 浏览器环境：xhr 对象 */
      if (req.xhr) {
        req.xhr.abort();
      } else if (typeof req.destroy === 'function') {
        /** Node.js 环境：ClientRequest 对象 */
        req.destroy();
      } else if (typeof req.abort === 'function') {
        req.abort();
      }

      var abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      abortError.code = 'ABORT_ERR';
      if (observer && !endEmitted) {
        endEmitted = true;
        safeEmit('abort', {
          ttfbMs: firstByteAt ? firstByteAt - startedAt : undefined,
          durationMs: Date.now() - startedAt,
          bytesSent: bytesSent,
          bytesReceived: bytesReceived,
          errorCode: 'ABORT_ERR'
        });
      }
      deferred.reject(abortError);
    };

    // 兼容不同的 signal 实现
    if (signal.addEventListener) {
      signal.addEventListener('abort', onAbort, {once: true});
    } else if (signal.on) {
      signal.once('abort', onAbort);
    }

    var cleanup = function () {
      if (signal.removeEventListener) {
        signal.removeEventListener('abort', onAbort);
      } else if (signal.off) {
        signal.off('abort', onAbort);
      }
    };

    // 清理Abort监听器
    // then(onFulfilled, onRejected) 两个 handler 都只做 cleanup，
    // 均隐式返回 undefined → 派生 Promise 始终 resolve，不会产生悬挂的 rejected promise
    deferred.promise.then(cleanup, cleanup);
  }

  if (req.xhr && typeof req.xhr.upload === 'object') {
    u.each(['progress', 'error', 'abort', 'timeout'], function (eventName) {
      req.xhr.upload.addEventListener(
        eventName,
        function (evt) {
          client.emit(eventName, evt);
        },
        false
      );
    });
  }

  /** 这里处理http/https请求抛出的错误 */
  req.on('error', function (error) {
    if (!isAborted) {
      if (observer && !endEmitted) {
        endEmitted = true;
        safeEmit('error', {
          ttfbMs: firstByteAt ? firstByteAt - startedAt : undefined,
          durationMs: Date.now() - startedAt,
          bytesSent: bytesSent,
          bytesReceived: bytesReceived,
          errorCode: (error && (error.code || error.name)) || 'NETWORK_ERROR'
        });
      }
      deferred.reject(error);
    }
  });

  // 包装 req.write 以累计上行字节数（仅当 observer 启用时）
  if (observer && req && typeof req.write === 'function') {
    var originalWrite = req.write.bind(req);
    req.write = function (chunk) {
      if (chunk) {
        if (typeof chunk.length === 'number') {
          bytesSent += chunk.length;
        } else if (typeof chunk.byteLength === 'number') {
          bytesSent += chunk.byteLength;
        }
      }
      return originalWrite.apply(req, arguments);
    };
  }

  try {
    client._sendRequest(req, body);
  } catch (ex) {
    if (observer && !endEmitted) {
      endEmitted = true;
      safeEmit('error', {
        durationMs: Date.now() - startedAt,
        bytesSent: bytesSent,
        bytesReceived: bytesReceived,
        errorCode: (ex && (ex.code || ex.name)) || 'SEND_ERROR'
      });
    }
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

  return util.format('%s%s-%s-%s-%s-%s%s%s', chunk(), chunk(), chunk(), chunk(), chunk(), chunk(), chunk(), chunk());
};

HttpClient.prototype._guessContentLength = function (data) {
  if (data == null) {
    return 0;
  } else if (typeof data === 'string') {
    return Buffer.byteLength(data);
  } else if (typeof data === 'object') {
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
  } else if (Buffer.isBuffer(data)) {
    return data.length;
  }

  throw new Error('No Content-Length is specified.');
};

HttpClient.prototype._fixHeaders = function (headers) {
  var fixedHeaders = {};

  if (headers) {
    Object.keys(headers).forEach(function (key) {
      var value = typeof headers[key] === 'string' ? headers[key].trim() : headers[key];
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
  var deferred = Q.defer();
  var payload = [];

  function parseHttpResponseBody(raw) {
    var contentType = responseHeaders['content-type'];

    if (!raw.length) {
      return {};
    } else if (contentType && /(application|text)\/json/.test(contentType)) {
      return JSON.parse(raw.toString());
    }
    return raw;
  }

  /* eslint-disable */
  res.on('data', function (chunk) {
    if (Buffer.isBuffer(chunk)) {
      payload.push(chunk);
    } else {
      // xhr2返回的内容是 string，不是 Buffer，导致 Buffer.concat 的时候报错了
      payload.push(new Buffer(chunk));
    }
  });

  res.on('error', function (error) {
    deferred.reject(error);
  });

  /* eslint-enable */
  res.on('end', function () {
    var raw = Buffer.concat(payload);
    var responseBody = null;

    try {
      debug('responseHeaders = %j', responseHeaders);
      responseBody = parseHttpResponseBody(raw);
    } catch (e) {
      debug('statusCode = %s, Parse response body error = %s', statusCode, e.message);
      deferred.reject(failure(statusCode, e.message));
      return;
    }

    if (statusCode >= 100 && statusCode < 200) {
      deferred.reject(failure(statusCode, 'Can not handle 1xx http status code.'));
    } else if (statusCode < 100 || statusCode >= 300) {
      if (responseBody.requestId) {
        deferred.reject(failure(statusCode, responseBody.message, responseBody, responseHeaders));
      } else {
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
  } else if (data instanceof stream.Readable) {
    if (!data.readable) {
      throw new Error('stream is not readable');
    }

    data.on('data', function (chunk) {
      req.write(chunk);
    });
    data.on('end', function () {
      req.end();
    });
  } else {
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

  if (/^https?/.test(uri)) {
    return uri;
  }

  return this.config.endpoint + uri;
};

function success(httpHeaders, body) {
  var response = {};

  response[H.X_HTTP_HEADERS] = httpHeaders;
  response[H.X_BODY] = body;

  return response;
}

/**
 * 失败响应体
 *
 * @typedef {Object} ResponseBody
 * @property {string} code - BOS服务端错误码
 * @property {string} message - BOS服务端错误信息
 * @property {string} requestId - BOS服务端请求ID
 */

/**
 * 统一的失败处理
 * @param {number} statusCode HTTP状态码
 * @param {string} message 错误信息
 * @param {ResponseBody=} responseBody 响应体信息
 * @param {Record<string, string>=} headers 请求头信息
 */
function failure(statusCode, message, responseBody, headers) {
  var response = {};

  response[H.X_STATUS_CODE] = statusCode;
  response[H.X_MESSAGE] = Buffer.isBuffer(message) ? String(message) : message;

  if (responseBody) {
    if (responseBody.code) {
      response[H.X_CODE] = responseBody.code;
    }

    if (responseBody.requestId) {
      response[H.X_REQUEST_ID] = responseBody.requestId;
    }
  }

  if (headers) {
    if (headers['date']) {
      response[H.X_BCE_DATE] = headers['date'];
    }

    if (headers[H.X_BCE_DEBUG_ID]) {
      response[H.X_BCE_DEBUG_ID] = headers[H.X_BCE_DEBUG_ID];
    }
  }

  return response;
}

module.exports = HttpClient;

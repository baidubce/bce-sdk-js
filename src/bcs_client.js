/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/bcs_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var crypto = require('crypto');
var util = require('util');
var path = require('path');
var fs = require('fs');

var u = require('underscore');

var H = require('./headers');
var HttpClient = require('./http_client');
var BceBaseClient = require('./bce_base_client');
var MimeType = require('./mime.types');

var MAX_PUT_OBJECT_LENGTH = 5368709120; // 5G
var MAX_USER_METADATA_SIZE = 2048; // 2 * 1024
// var MIN_PART_NUMBER = 1;
// var MAX_PART_NUMBER = 10000;


/**
 * BCS service api
 *
 * @see http://developer.baidu.com/wiki/index.php?title=docs/cplat/bcs/api
 * @constructor
 * @param {Object} config The bos client configuration.
 * @extends {BceBaseClient}
 */
function BcsClient(config) {
    BceBaseClient.call(this, config, 'bcs', true);
}
util.inherits(BcsClient, BceBaseClient);

// --- BEGIN ---

BcsClient.prototype.listBuckets = function (options) {
    options = options || {};
    return this.sendRequest('GET', {config: options.config});
};

BcsClient.prototype.createBucket = function (bucketName, options) {
    options = options || {};

    return this.sendRequest('PUT', {
        bucketName: bucketName,
        config: options.config
    });
};

BcsClient.prototype.setBucketAcl = function (bucketName, acl, options) {
    options = options || {};

    var headers = {};
    headers[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
    return this.sendRequest('PUT', {
        bucketName: bucketName,
        body: JSON.stringify({accessControlList: acl}),
        headers: headers,
        params: {acl: ''},
        config: options.config
    });
};

BcsClient.prototype.setBucketCannedAcl = function (bucketName, cannedAcl, options) {
    options = options || {};

    var headers = {};
    headers[H.X_BCE_ACL] = cannedAcl;
    return this.sendRequest('PUT', {
        bucketName: bucketName,
        headers: headers,
        params: {acl: ''},
        config: options.config
    });
};

BcsClient.prototype.getBucketAcl = function (bucketName, options) {
    options = options || {};

    return this.sendRequest('GET', {
        bucketName: bucketName,
        params: {acl: '1'},
        config: options.config
    });
};

BcsClient.prototype.deleteBucket = function (bucketName, options) {
    options = options || {};

    return this.sendRequest('DELETE', {
        bucketName: bucketName,
        config: options.config
    });
};

BcsClient.prototype.deleteObject = function (bucketName, key, options) {
    options = options || {};

    return this.sendRequest('DELETE', {
        bucketName: bucketName,
        key: key,
        config: options.config
    });
};

BcsClient.prototype.listObjects = function (bucketName, options) {
    options = options || {};

    var params = u.extend({}, u.pick(options, 'start', 'limit'));

    return this.sendRequest('GET', {
        bucketName: bucketName,
        params: params,
        config: options.config
    });
};

BcsClient.prototype.getObjectMetadata = function (bucketName, key, options) {
    options = options || {};

    return this.sendRequest('HEAD', {
        bucketName: bucketName,
        key: key,
        config: options.config
    });
};

BcsClient.prototype.putObject = function (bucketName, key, data, options) {
    if (!key) {
        throw new TypeError('key should not be empty.');
    }

    options = this._checkOptions(options || {});

    return this.sendRequest('PUT', {
        bucketName: bucketName,
        key: key,
        body: data,
        headers: options.headers,
        config: options.config
    });
};

BcsClient.prototype.putObjectFromBlob = function (bucketName, key, blob, options) {
    var headers = {};

    // https://developer.mozilla.org/en-US/docs/Web/API/Blob/size
    headers[H.CONTENT_LENGTH] = blob.size;
    // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
    // 而且根据 API 文档，这个字段不是必填的。
    options = u.extend(headers, options);

    return this.putObject(bucketName, key, blob, options);
};


BcsClient.prototype.putObjectFromString = function (bucketName, key, data, options) {
    var headers = {};
    headers[H.CONTENT_LENGTH] = Buffer.byteLength(data);
    headers[H.CONTENT_MD5] = require('./crypto').md5sum(data, null, 'hex');
    options = u.extend(headers, options);

    return this.putObject(bucketName, key, data, options);
};

BcsClient.prototype.putObjectFromFile = function (bucketName, key, filename, options) {
    options = options || {};

    var headers = {};
    headers[H.CONTENT_LENGTH] = fs.statSync(filename).size;

    // 因为Firefox会在发起请求的时候自动给 Content-Type 添加 charset 属性
    // 导致我们计算签名的时候使用的 Content-Type 值跟服务器收到的不一样，为了
    // 解决这个问题，我们需要显式的声明Charset
    headers[H.CONTENT_TYPE] = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(filename));
    options = u.extend(headers, options);

    var fp = fs.createReadStream(filename);
    if (!u.has(options, H.CONTENT_MD5)) {
        var me = this;
        return require('./crypto').md5file(filename, 'hex')
            .then(function (md5sum) {
                options[H.CONTENT_MD5] = md5sum;
                return me.putObject(bucketName, key, fp, options);
            });
    }
    return this.putObject(bucketName, key, fp, options);
};

/**
 * 只返回MBO的签名（Method, Bucket Name, Object Name），对于上传的应用足够了.
 *
 * @see http://developer.baidu.com/wiki/index.php?title=docs/cplat/bcs/access/signed-url
 * @param {Object} credentials ak和sk信息.
 * @param {string} httpMethod The request method.
 * @param {string} bucketName The bucket name.
 * @param {string} objectName The object name.
 *
 * @return {string} The signature.
 */
BcsClient.prototype.createSignature = function (credentials, httpMethod, bucketName, objectName) {
    var flag = 'MBO';
    var body = [
        'Method=' + httpMethod,
        'Bucket=' + bucketName,
        'Object=' + objectName
    ].join('\n');

    var content = flag + '\n' + body + '\n';

    var hmac = crypto.createHmac('sha1', credentials.sk);
    hmac.update(new Buffer(content, 'utf-8'));
    var digest = encodeURIComponent(hmac.digest('base64')).replace(/%2F/g, '/');

    return [flag, credentials.ak, digest].join(':');
};

// --- E N D ---

BcsClient.prototype.sendRequest = function (httpMethod, varArgs) {
    var defaultArgs = {
        bucketName: null,
        key: null,
        body: null,
        headers: {},
        params: {},
        config: {},
        outputStream: null
    };
    var args = u.extend(defaultArgs, varArgs);

    var config = u.extend({}, this.config, args.config);
    var resource = '/';
    if (args.bucketName) {
        resource += args.bucketName;
    }
    if (args.key) {
        resource += '/' + args.key;
    }

    var signature = this.createSignature(config.credentials,
        httpMethod,
        args.bucketName ? args.bucketName : '',
        args.key ? ('/' + args.key) : '/');

    var client = this;
    var agent = this._httpAgent = new HttpClient(config);
    u.each(['progress', 'error', 'abort', 'timeout'], function (eventName) {
        agent.on(eventName, function (evt) {
            client.emit(eventName, evt);
        });
    });

    agent.buildQueryString = function (params) {
        var qs = require('querystring').stringify(params);
        if (qs) {
            return 'sign=' + signature + '&' + qs;
        }

        // signature的值不应该被 encodeURIComponent
        return 'sign=' + signature;
    };

    return agent.sendRequest(httpMethod, resource, args.body,
        args.headers, args.params, null, args.outputStream);
};


BcsClient.prototype._checkOptions = function (options, allowedParams) {
    var rv = {};

    rv.config = options.config || {};
    rv.headers = this._prepareObjectHeaders(options);
    rv.params = u.pick(options, allowedParams || []);

    return rv;
};

BcsClient.prototype._prepareObjectHeaders = function (options) {
    var allowedHeaders = [
        H.CONTENT_LENGTH,
        H.CONTENT_ENCODING,
        H.CONTENT_MD5,
        H.CONTENT_TYPE,
        H.CONTENT_DISPOSITION,
        H.ETAG,
        H.SESSION_TOKEN
    ];
    var metaSize = 0;
    var headers = u.pick(options, function (value, key) {
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
        var contentLength = headers[H.CONTENT_LENGTH];
        if (contentLength < 0) {
            throw new TypeError('content_length should not be negative.');
        }
        else if (contentLength > MAX_PUT_OBJECT_LENGTH) { // 5G
            throw new TypeError('Object length should be less than ' + MAX_PUT_OBJECT_LENGTH
                + '. Use multi-part upload instead.');
        }
    }

    if (u.has(headers, 'ETag')) {
        var etag = headers.ETag;
        if (!/^"/.test(etag)) {
            headers.ETag = util.format('"%s"', etag);
        }
    }

    if (!u.has(headers, H.CONTENT_TYPE)) {
        headers[H.CONTENT_TYPE] = 'application/octet-stream';
    }

    return headers;
};


module.exports = BcsClient;



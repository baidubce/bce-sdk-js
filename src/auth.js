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
 * @file src/auth.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');
var u = require('underscore');

var debug = require('debug')('bce-sdk:auth');

var H = require('./headers');
var strings = require('./strings');

/**
 * Auth
 *
 * @constructor
 * @param {string} ak The access key.
 * @param {string} sk The security key.
 */
function Auth(ak, sk) {
    this.ak = ak;
    this.sk = sk;
}

/**
 * Generate the signature based on http://gollum.baidu.com/AuthenticationMechanism
 *
 * @param {string} method The http request method, such as GET, POST, DELETE, PUT, ...
 * @param {string} resource The request path.
 * @param {Object=} params The query strings.
 * @param {Object=} headers The http request headers.
 * @param {number=} timestamp Set the current timestamp.
 * @param {number=} expirationInSeconds The signature validation time.
 * @param {Array.<string>=} headersToSign The request headers list which will be used to calcualate the signature.
 *
 * @return {string} The signature.
 */
Auth.prototype.generateAuthorization = function (
    method,
    resource,
    params,
    headers,
    timestamp,
    expirationInSeconds,
    headersToSign
) {
    var now = this.getTimestamp(timestamp);
    var rawSessionKey = util.format('bce-auth-v1/%s/%s/%d', this.ak, now, expirationInSeconds || 1800);
    debug('rawSessionKey = %j', rawSessionKey);
    var signingKey = this.hash(rawSessionKey, this.sk);

    var canonicalUri = this.generateCanonicalUri(resource);
    var canonicalQueryString = this.queryStringCanonicalization(params || {});

    var rv = this.headersCanonicalization(headers || {}, headersToSign);
    var canonicalHeaders = rv[0];
    var signedHeaders = rv[1];
    debug('canonicalUri = %j', canonicalUri);
    debug('canonicalQueryString = %j', canonicalQueryString);
    debug('canonicalHeaders = %j', canonicalHeaders);
    debug('signedHeaders = %j', signedHeaders);

    var rawSignature = util.format('%s\n%s\n%s\n%s', method, canonicalUri, canonicalQueryString, canonicalHeaders);
    debug('rawSignature = %j', rawSignature);
    debug('signingKey = %j', signingKey);
    var signature = this.hash(rawSignature, signingKey);

    if (signedHeaders.length) {
        return util.format('%s/%s/%s', rawSessionKey, signedHeaders.join(';'), signature);
    }
    return util.format('%s//%s', rawSessionKey, signature);
};

Auth.prototype.uriCanonicalization = function (uri) {
    return uri;
};

/**
 * Canonical the query strings.
 *
 * @see http://gollum.baidu.com/AuthenticationMechanism#生成CanonicalQueryString
 * @param {Object} params The query strings.
 * @return {string}
 */
Auth.prototype.queryStringCanonicalization = function (params) {
    var canonicalQueryString = [];
    Object.keys(params).forEach(function (key) {
        if (key.toLowerCase() === H.AUTHORIZATION.toLowerCase()) {
            return;
        }

        var value = params[key] == null ? '' : params[key];
        canonicalQueryString.push(key + '=' + strings.normalize(value));
    });

    canonicalQueryString.sort();

    return canonicalQueryString.join('&');
};

/**
 * Canonical the http request headers.
 *
 * @see http://gollum.baidu.com/AuthenticationMechanism#生成CanonicalHeaders
 * @param {Object} headers The http request headers.
 * @param {Array.<string>=} headersToSign The request headers list which will be used to calcualate the signature.
 * @return {*} canonicalHeaders and signedHeaders
 */
Auth.prototype.headersCanonicalization = function (headers, headersToSign) {
    if (!headersToSign || !headersToSign.length) {
        headersToSign = [H.HOST, H.CONTENT_MD5, H.CONTENT_LENGTH, H.CONTENT_TYPE];
    }
    debug('headers = %j, headersToSign = %j', headers, headersToSign);

    var headersMap = {};
    headersToSign.forEach(function (item) {
        headersMap[item.toLowerCase()] = true;
    });

    var canonicalHeaders = [];
    Object.keys(headers).forEach(function (key) {
        var value = headers[key];
        value = u.isString(value) ? strings.trim(value) : value;
        if (value == null || value === '') {
            return;
        }
        key = key.toLowerCase();
        if (/^x\-bce\-/.test(key) || headersMap[key] === true) {
            canonicalHeaders.push(
                util.format(
                    '%s:%s',
                    // encodeURIComponent(key), encodeURIComponent(value)));
                    strings.normalize(key),
                    strings.normalize(value)
                )
            );
        }
    });

    canonicalHeaders.sort();

    var signedHeaders = [];
    canonicalHeaders.forEach(function (item) {
        signedHeaders.push(item.split(':')[0]);
    });

    return [canonicalHeaders.join('\n'), signedHeaders];
};

Auth.prototype.hash = function (data, key) {
    var crypto = require('crypto');
    var sha256Hmac = crypto.createHmac('sha256', key);
    sha256Hmac.update(data);
    return sha256Hmac.digest('hex');
};

/* IAM 逻辑 */
/**
 * convert the string of timestamp format to ISO8601 format
 * @param {number} timestamp a number representing timestamp in seconds
 * @returns 
 */
Auth.prototype.getTimestamp = function getTimestamp(timestamp) {
    var now = timestamp ? new Date(timestamp * 1000) : new Date();
    return now.toISOString().replace(/\.\d+Z$/, 'Z');
};

Auth.prototype.normalize = function (string, encodingSlash) {
    var kEscapedMap = {
        '!': '%21',
        "'": '%27',
        '(': '%28',
        ')': '%29',
        '*': '%2A'
    };

    if (string === null) {
        return '';
    }
    var result = encodeURIComponent(string);
    result = result.replace(/[!'\(\)\*]/g, function ($1) {
        return kEscapedMap[$1];
    });

    if (encodingSlash === false) {
        result = result.replace(/%2F/gi, '/');
    }

    return result;
};

Auth.prototype.generateCanonicalUri = function (url) {
    if (!url.includes('bos-share.baidubce.com')) {
        return url;
    }

    var pathname = require('url').parse(url).pathname.trim();
    var resources = pathname.replace(/^\//, '').split('/');
    if (!resources) {
        return '';
    }
    var normalizedResourceStr = '';
    for (var i = 0; i < resources.length; i++) {
        normalizedResourceStr += '/' + this.normalize(resources[i]);
    }
    return normalizedResourceStr;
};

module.exports = Auth;

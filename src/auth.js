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

import util from 'util';
import u from 'underscore';
import crypto from 'crypto';

import _debug from 'debug';

import {
    AUTHORIZATION,
    CONTENT_MD5,
    CONTENT_LENGTH,
    CONTENT_TYPE,
    HOST
} from './headers';
import strings from './strings';

const debug = _debug('bce-sdk:auth');

export default class Auth {
    constructor(ak, sk) {
        this.ak = ak;
        this.sk = sk;
    }

    generateAuthorization(method, resource, params = {}, headers = {},
        timestamp = new Date(), expirationInSeconds = 1800, headersToSign = {}) {
        let now = u.isNumber(timestamp) ? new Date(timestamp * 1000) : timestamp;
        let rawSessionKey = util.format('bce-auth-v1/%s/%s/%d',
            this.ak, now.toISOString().replace(/\.\d+Z$/, 'Z'), expirationInSeconds);
        let sessionKey = this.hash(rawSessionKey, this.sk);
        debug('rawSessionKey = %j, sessionKey = %j', rawSessionKey, sessionKey);

        let canonicalUri = this.uriCanonicalization(resource);
        let canonicalQueryString = this.queryStringCanonicalization(params);

        let [canonicalHeaders, signedHeaders] = this.headersCanonicalization(headers, headersToSign);

        debug('canonicalUri = %j', canonicalUri);
        debug('canonicalQueryString = %j', canonicalQueryString);
        debug('canonicalHeaders = %j', canonicalHeaders);
        debug('signedHeaders = %j', signedHeaders);

        let rawSignature = util.format('%s\n%s\n%s\n%s',
            method, canonicalUri, canonicalQueryString, canonicalHeaders);
        debug('rawSignature = %j', rawSignature);
        let signature = this.hash(rawSignature, sessionKey);

        if (signedHeaders.length) {
            return util.format('%s/%s/%s', rawSessionKey, signedHeaders.join(';'), signature);
        }

        return util.format('%s//%s', rawSessionKey, signature);
    }

    uriCanonicalization(uri) {
        return uri;
    }

    queryStringCanonicalization(params) {
        let canonicalQueryString = [];
        Object.keys(params).forEach(key => {
            if (key.toLowerCase() === AUTHORIZATION.toLowerCase()) {
                return;
            }

            let value = params[key] == null ? '' : params[key];
            canonicalQueryString.push(key + '=' + strings.normalize(value));
        });

        canonicalQueryString.sort();

        return canonicalQueryString.join('&');
    }

    headersCanonicalization(headers, headersToSign) {
        if (!headersToSign || !headersToSign.length) {
            headersToSign = [HOST, CONTENT_MD5, CONTENT_LENGTH, CONTENT_TYPE];
        }
        debug('headers = %j, headersToSign = %j', headers, headersToSign);

        let headersMap = {};
        headersToSign.forEach(item => headersMap[item.toLowerCase()] = true);

        let canonicalHeaders = [];
        Object.keys(headers).forEach(key => {
            let value = headers[key];
            value = u.isString(value) ? strings.trim(value) : value;
            if (value == null || value === '') {
                return;
            }
            key = key.toLowerCase();
            if (/^x\-bce\-/.test(key) || headersMap[key] === true) {
                canonicalHeaders.push(util.format('%s:%s',
                    // encodeURIComponent(key), encodeURIComponent(value)));
                    strings.normalize(key), strings.normalize(value)));
            }
        });

        canonicalHeaders.sort();

        let signedHeaders = [];
        canonicalHeaders.forEach(item => signedHeaders.push(item.split(':')[0]));

        return [canonicalHeaders.join('\n'), signedHeaders];
    }
    hash(data, key) {
        let sha256Hmac = crypto.createHmac('sha256', key);
        sha256Hmac.update(data);
        return sha256Hmac.digest('hex');
    }
}

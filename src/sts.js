/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/sts.js
 * @author zhouhua
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');
var u = require('underscore');

var BceBaseClient = require('./bce_base_client');

/**
 * STS支持 - 将STS抽象成一种服务
 *
 * @see https://bce.baidu.com/doc/BOS/API.html#STS.20.E6.9C.8D.E5.8A.A1.E6.8E.A5.E5.8F.A3
 * @constructor
 * @param {Object} config The STS configuration.
 * @extends {BceBaseClient}
 */
function STS(config) {
    BceBaseClient.call(this, config, 'sts', true);
}
util.inherits(STS, BceBaseClient);

// --- BEGIN ---

STS.prototype.getSessionToken = function (durationSeconds, params, options) {
    options = options || {};

    var body = '';
    if (params) {
        params = u.pick(params, 'id', 'accessControlList');

        if (params.accessControlList) {
            params.accessControlList = u.map(params.accessControlList, function (acl) {
                return u.pick(acl, 'eid', 'service', 'region', 'effect', 'resource', 'permission');
            });
        }

        body = JSON.stringify(params);
    }

    var url = '/v1/sessionToken';

    return this.sendRequest('POST', url, {
        config: options.config,
        params: {
            durationSeconds: durationSeconds
        },
        body: body
    });
};

// --- E N D ---

module.exports = STS;


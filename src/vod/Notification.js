/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * @file src/vod/Notification.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
// var debug = require('debug')('bce-sdk:VodClient.Notification');

var BceBaseClient = require('../bce_base_client');


/**
 * 音视频通知接口
 * https://cloud.baidu.com/doc/VOD/API.html#.E9.80.9A.E7.9F.A5.E6.8E.A5.E5.8F.A3
 *
 * @param {Object} config The VodClient.Media Config
 * @constructor
 */
function Notification(config) {
    BceBaseClient.call(this, config, 'vod', false);
}
util.inherits(Notification, BceBaseClient);

Notification.prototype._buildUrl = function () {
    var baseUrl = '/v1/notification';
    var extraPaths = u.toArray(arguments);

    if (extraPaths.length) {
        baseUrl += '/' + extraPaths.join('/');
    }

    return baseUrl;
};

// --- BEGIN ---

/**
 * 创建通知
 *
 * @param {string} name The notification name.
 * @param {string} endpoint The notification endpoint.
 * @return {Promise.<Object>}
 */
Notification.prototype.create = function (name, endpoint) {
    var url = this._buildUrl();
    var payload = {
        name: name,
        endpoint: endpoint
    };

    return this.sendRequest('POST', url, {
        body: JSON.stringify(payload)
    });
};

/**
 * 查询通知
 *
 * @param {string} name The notification name.
 * @return {Promise.<Object>}
 */
Notification.prototype.get = function (name) {
    var url = this._buildUrl(name);

    return this.sendRequest('GET', url);
};

/**
 * 通知列表
 *
 * @return {Promise.<Object>}
 */
Notification.prototype.listAll = function () {
    var url = this._buildUrl();

    return this.sendRequest('GET', url);
};

/**
 * 删除通知
 *
 * @param {string} name The notification name.
 * @return {Promise.<Object>}
 */
Notification.prototype.remove = function (name) {
    var url = this._buildUrl(name);

    return this.sendRequest('DELETE', url);
};

// --- E N D ---

module.exports = Notification;

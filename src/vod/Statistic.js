/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * @file src/vod/Statistic.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
var debug = require('debug')('bce-sdk:VodClient.Statistic');

var BceBaseClient = require('../bce_base_client');
var helper = require('../helper');

/**
 * 音视频统计接口
 * https://cloud.baidu.com/doc/VOD/API.html#.E7.BB.9F.E8.AE.A1.E6.8E.A5.E5.8F.A3
 *
 * @param {Object} config The VodClient.Statistic Config
 *
 * @constructor
 */
function Statistic(config) {
    BceBaseClient.call(this, config, 'vod', false);

    this._mediaId = null;
}
util.inherits(Statistic, BceBaseClient);

Statistic.prototype.setMediaId = function (mediaId) {
    this._mediaId = mediaId;
    return this;
};

Statistic.prototype._buildUrl = function () {
    var baseUrl = '/v1/statistic';
    var extraPaths = u.toArray(arguments);

    if (extraPaths.length) {
        baseUrl += '/' + extraPaths.join('/');
    }

    return baseUrl;
};

// --- BEGIN ---

/**
 * 查询媒资播放信息
 *
 * @param {Object} options 过滤参数.
 * @return {Promise.<Object>}
 */
Statistic.prototype.stat = function (options) {
    var url = this._buildUrl('media', this._mediaId);
    var params = u.pick(u.extend({
        startTime: null,
        endTime: null,
        aggregate: true
    }, options), helper.omitNull);

    debug('stat.params = %j', params);

    return this.sendRequest('GET', url, {params: params});
};

// --- E N D ---

module.exports = Statistic;

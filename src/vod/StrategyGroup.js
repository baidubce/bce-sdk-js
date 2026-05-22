/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * @file src/vod/StrategyGroup.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
// var debug = require('debug')('bce-sdk:VodClient.StrategyGroup');

var BceBaseClient = require('../bce_base_client');


/**
 * 音视频策略组接口
 * https://cloud.baidu.com/doc/VOD/API.html#.E7.AD.96.E7.95.A5.E7.BB.84.E6.8E.A5.E5.8F.A3
 *
 * @param {Object} config The VodClient.Media Config
 * @constructor
 */
function StrategyGroup(config) {
    BceBaseClient.call(this, config, 'vod', false);
}
util.inherits(StrategyGroup, BceBaseClient);

StrategyGroup.prototype._buildUrl = function () {
    var baseUrl = '/v1/strategygroup';
    var extraPaths = u.toArray(arguments);

    if (extraPaths.length) {
        baseUrl += '/' + extraPaths.join('/');
    }

    return baseUrl;
};

// --- BEGIN ---

/**
 * 查询特定策略组
 *
 * @param {string} strategyGroupName 策略组名称.
 * @return {Promise.<Object>}
 */
StrategyGroup.prototype.get = function (strategyGroupName) {
    var url = this._buildUrl(strategyGroupName);

    return this.sendRequest('GET', url);
};

/**
 * 查询所有策略组
 *
 * @return {Promise.<Object>}
 */
StrategyGroup.prototype.listAll = function () {
    var url = this._buildUrl();

    return this.sendRequest('GET', url);
};

/**
 * 更新特定策略组
 *
 * @param {string} strategyGroupName 策略组的名称.
 * @param {Object} config 策略组的配置.
 * @return {Promise.<Object>}
 */
StrategyGroup.prototype.update = function (strategyGroupName, config) {
    var url = this._buildUrl(strategyGroupName);

    return this.sendRequest('PUT', url, {
        body: JSON.stringify(config)
    });
};

// --- E N D ---

module.exports = StrategyGroup;

/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * @file src/vod/PresetGroup.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
// var debug = require('debug')('bce-sdk:VodClient.PresetGroup');

var BceBaseClient = require('../bce_base_client');


/**
 * 转码模板组接口
 * https://cloud.baidu.com/doc/VOD/API.html#.E8.BD.AC.E7.A0.81.E6.A8.A1.E6.9D.BF.E7.BB.84.E6.8E.A5.E5.8F.A3
 *
 * @param {Object} config The VodClient.Media Config
 * @constructor
 */
function PresetGroup(config) {
    BceBaseClient.call(this, config, 'vod', false);
}
util.inherits(PresetGroup, BceBaseClient);

PresetGroup.prototype._buildUrl = function () {
    var baseUrl = '/v1/presetgroup';
    var extraPaths = u.toArray(arguments);

    if (extraPaths.length) {
        baseUrl += '/' + extraPaths.join('/');
    }

    return baseUrl;
};

// --- BEGIN ---

/**
 * 创建转码模板组
 *
 * @param {Object} config 转码模板组的配置.
 * @return {Promise.<Object>}
 */
PresetGroup.prototype.create = function (config) {
    var url = this._buildUrl();

    return this.sendRequest('POST', url, {
        body: JSON.stringify(config)
    });
};

/**
 * 查询指定转码模板组
 *
 * @param {string} presetGroupName 转码模版组的名称.
 * @return {Promise.<Object>}
 */
PresetGroup.prototype.get = function (presetGroupName) {
    var url = this._buildUrl(presetGroupName);

    return this.sendRequest('GET', url);
};

/**
 * 查询用户所有转码模板组
 *
 * @return {Promise.<Object>}
 */
PresetGroup.prototype.listAll = function () {
    var url = this._buildUrl();

    return this.sendRequest('GET', url);
};

/**
 * 更新指定转码模板
 *
 * @param {string} presetGroupName 转码模版组的名称.
 * @param {Object} config 转码模版组的配置.
 * @return {Promise.<Object>}
 */
PresetGroup.prototype.update = function (presetGroupName, config) {
    var url = this._buildUrl(presetGroupName);

    return this.sendRequest('PUT', url, {
        body: JSON.stringify(config)
    });
};

/**
 * 删除转码模板组
 *
 * @param {string} presetGroupName 转码模版组的名称.
 * @return {Promise.<Object>}
 */
PresetGroup.prototype.remove = function (presetGroupName) {
    var url = this._buildUrl(presetGroupName);

    return this.sendRequest('DELETE', url);
};

// --- E N D ---

module.exports = PresetGroup;

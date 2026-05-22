/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * @file src/vod/Player.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
// var debug = require('debug')('bce-sdk:VodClient.Player');

var BceBaseClient = require('../bce_base_client');
// var BosClient = require('../bos_client');
// var H = require('../headers');
var helper = require('../helper');


/**
 * 音视频播放器服务接口
 * https://cloud.baidu.com/doc/VOD/API.html#.E6.92.AD.E6.94.BE.E5.99.A8.E6.9C.8D.E5.8A.A1.E6.8E.A5.E5.8F.A3
 *
 * @param {Object} config The VodClient.Media Config
 *
 * @constructor
 */
function Player(config) {
    BceBaseClient.call(this, config, 'vod', false);

    this._mediaId = null;
}
util.inherits(Player, BceBaseClient);

Player.prototype.setMediaId = function (mediaId) {
    this._mediaId = mediaId;
    return this;
};

Player.prototype._buildUrl = function () {
    var baseUrl = '/v1/media';
    var extraPaths = u.toArray(arguments);

    if (extraPaths.length) {
        baseUrl += '/' + extraPaths.join('/');
    }

    return baseUrl;
};

// --- BEGIN ---

/**
 * 查询媒资分发信息
 *
 * @param {string?} transcodingPresetName 转码模版名称.
 * @return {Promise.<Object>}
 */
Player.prototype.delivery = function (transcodingPresetName) {
    var url = this._buildUrl(this._mediaId, 'delivery');
    var params = u.pick({
        transcodingPresetName: transcodingPresetName
    }, u.identity);

    return this.sendRequest('GET', url, {params: params}).then(function (response) {
        if (response.body.success === true) {
            response.body = response.body.result;
        }
        return response;
    });
};

/**
 * 查询媒资播放代码
 *
 * @param {Object} options 配置参数.
 * @return {Promise.<Object>}
 */
Player.prototype.code = function (options) {
    var url = this._buildUrl(this._mediaId, 'code');
    var params = u.extend({
        // required
        width: 100,
        height: 100,
        autostart: true,
        ak: null,

        // optional
        transcodingPresetName: null
    }, options);
    params = u.pick(params, helper.omitNull);

    return this.sendRequest('GET', url, {params: params}).then(function (response) {
        var codes = response.body.codes;
        for (var i = 0; i < codes.length; i++) {
            var item = codes[i];
            if (item.codeType === 'html') {
                item.sourceCode = new Buffer(item.sourceCode, 'base64').toString('utf-8');
                break;
            }
        }
        return response;
    });
};
// --- E N D ---

module.exports = Player;

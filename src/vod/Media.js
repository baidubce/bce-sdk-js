/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * @file src/vod/Media.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
var debug = require('debug')('bce-sdk:VodClient.Media');

var BceBaseClient = require('../bce_base_client');
// var BosClient = require('../bos_client');
// var H = require('../headers');
var helper = require('../helper');
var Statistic = require('./Statistic');

/**
 * 音视频媒资接口
 * https://cloud.baidu.com/doc/VOD/API.html#.E9.9F.B3.E8.A7.86.E9.A2.91.E5.AA.92.E8.B5.84.E6.8E.A5.E5.8F.A3
 *
 * @param {Object} config The VodClient.Media Config
 *
 * @constructor
 */
function Media(config) {
    BceBaseClient.call(this, config, 'vod', false);

    this._mediaId = null;
    this._sourceBucket = null;
    this._sourceKey = null;
    this._host = null;
}
util.inherits(Media, BceBaseClient);

Media.prototype.setMediaId = function (mediaId) {
    this._mediaId = mediaId;
    return this;
};

Media.prototype._buildUrl = function () {
    var baseUrl = '/v1/media';
    var extraPaths = u.toArray(arguments);

    if (extraPaths.length) {
        baseUrl += '/' + extraPaths.join('/');
    }

    return baseUrl;
};

// --- BEGIN ---

/**
 * 申请媒资
 *
 * @param {string} mode 提供"no_transcoding"说明要申请一个不转码的媒资；提供NULL/""/其他值说明申请一个普通的转码媒资
 * @return {Promise.<Object>}
 */
Media.prototype.apply = function (mode) {
    var url = this._buildUrl();
    var options = {
        params: {
            apply: '',
            mode: mode
        }
    };

    var self = this;
    return this.sendRequest('POST', url, options).then(function (response) {
        self._mediaId = response.body.mediaId;
        self._sourceBucket = response.body.sourceBucket;
        self._sourceKey = response.body.sourceKey;
        self._host = response.body.host;

        return response;
    });
};

/**
 * 处理媒资
 *
 * @param {string} title The media title.
 * @param {Object?} options The extra media attributes.
 *
 * @return {Promise.<Object>}
 */
Media.prototype.process = function (title, options) {
    var url = this._buildUrl(this._mediaId);
    var payload = u.extend({
        title: title,
        description: null,
        sourceExtension: null,
        transcodingPresetGroupName: null
    }, options);
    payload = u.pick(payload, helper.omitNull);

    return this.sendRequest('POST', url, {
        params: {
            process: ''
        },
        body: JSON.stringify(payload)
    });
};

/**
 * 停用指定媒资，仅对 PUBLISHED 状态的媒资有效
 *
 * @param {string?} opt_mediaId 媒资Id.
 * @return {Promise.<Object>}
 */
Media.prototype.disable = function (opt_mediaId) {
    var url = this._buildUrl(opt_mediaId || this._mediaId);
    return this.sendRequest('PUT', url, {
        params: {
            disable: ''
        }
    });
};

/**
 * 恢复指定媒资，仅对 DISABLED 状态的媒资有效
 *
 * @param {string?} opt_mediaId 媒资Id.
 * @return {Promise.<Object>}
 */
Media.prototype.resume = function (opt_mediaId) {
    var url = this._buildUrl(opt_mediaId || this._mediaId);
    return this.sendRequest('PUT', url, {
        params: {
            publish: ''
        }
    });
};


/**
 * 删除指定媒资，对 RUNNING 状态的媒资无效
 *
 * @param {string?} opt_mediaId 媒资Id.
 * @return {Promise.<Object>}
 */
Media.prototype.remove = function (opt_mediaId) {
    var url = this._buildUrl(opt_mediaId || this._mediaId);
    return this.sendRequest('DELETE', url);
};

/**
 * 查询指定媒资
 *
 * @param {string?} opt_mediaId 媒资Id.
 * @return {Promise.<Object>}
 */
Media.prototype.get = function (opt_mediaId) {
    var url = this._buildUrl(opt_mediaId || this._mediaId);
    debug('url = %j', url);
    return this.sendRequest('GET', url);
};

/**
 * 查询指定媒资的部分信息
 *
 * @param {string?} opt_mediaId 媒资Id.
 * @param {string?} scope 查询范围，目前仅支持thumbnail
 * @param {string?} taskId 不同scope下的某个任务标识，目前当scope=thumbnail时，taskId分别可取default、second、wonderful
 * @return {Promise.<Object>}
 */
Media.prototype.getPartInfo = function (opt_mediaId, scope, taskId) {
    var url = this._buildUrl(opt_mediaId || this._mediaId);
    debug('url = %j', url);
    return this.sendRequest('GET', url, {
        params: {
            scope: scope,
            taskId: taskId
        }
    });
};

/**
 * 获取音视频媒资的源文件下载地址
 *
 * @param {string?} opt_mediaId 媒资Id.
 * @param {number?} opt_expiredInSeconds 过期时间，单位(s)
 *
 * @return {Promise.<Object>}
 */
Media.prototype.getDownloadUrl = function (opt_mediaId, opt_expiredInSeconds) {
    var expiredInSeconds = opt_expiredInSeconds || 60 * 60 * 24; // 默认1天
    var url = this._buildUrl(opt_mediaId || this._mediaId);
    return this.sendRequest('GET', url, {
        params: {
            sourcedownload: '',
            expiredInSeconds: expiredInSeconds
        }
    });
};

/**
 * 更新指定媒资
 *
 * @param {string} title The media title.
 * @param {string?} description The media description.
 *
 * @return {Promise.<Object>}
 */
Media.prototype.update = function (title, description) {
    var url = this._buildUrl(this._mediaId);
    var payload = u.pick({
        title: title,
        description: description
    }, u.identity);

    return this.sendRequest('PUT', url, {
        params: {
            attributes: ''
        },
        body: JSON.stringify(payload)
    });
};

/**
 * 查询媒资播放信息，例如：播放次数、最大并发播放次数及下行流量
 *
 * @param {Object?} options 过滤参数.
 * @return {Promise.<Object>}
 */
Media.prototype.stat = function (options) {
    var statClient = new Statistic(this.config);
    return statClient.setMediaId(this._mediaId).stat(options);
};

/**
 * 筛选媒资并分页展示
 *
 * 1. pageNo + pageSize
 * 2. marker + maxSize
 *
 * @param {Object?} options The extra pagination and filter parameters.
 *
 * @return {Promise.<Object>}
 */
Media.prototype.list = function (options) {
    var url = this._buildUrl();
    var params = u.extend({
        pageSize: 10,
        pageNo: null,
        marker: null,
        maxSize: null,

        status: null,
        begin: null,
        end: null,
        title: null
    }, options);
    params = u.pick(params, helper.omitNull);

    if (params.marker != null) {
        delete params.pageNo;
        delete params.pageSize;
    }
    else if (params.pageSize) {
        delete params.marker;
        delete params.maxSize;
    }

    debug('list params = %j', params);

    return this.sendRequest('GET', url, {
        params: params
    });
};
// --- E N D ---


module.exports = Media;







/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/vod_client.js
 * @author zhouhua
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');
var u = require('underscore');
var url = require('url');

var BceBaseClient = require('./bce_base_client');
var BosClient = require('./bos_client');
var helper = require('./helper');
var Media = require('./vod/Media');
var Notification = require('./vod/Notification');
var Player = require('./vod/Player');
var PresetGroup = require('./vod/PresetGroup');
var Statistic = require('./vod/Statistic');
var StrategyGroup = require('./vod/StrategyGroup');

/**
 * VOD音视频点播服务
 *
 * @see https://bce.baidu.com/doc/VOD/API.html#API.E6.8E.A5.E5.8F.A3
 * @constructor
 * @param {Object} config The VodClient configuration.
 * @extends {BceBaseClient}
 */
function VodClient(config) {
    BceBaseClient.call(this, config, 'vod', true);
}
util.inherits(VodClient, BceBaseClient);

// --- BEGIN ---

VodClient.prototype.createMediaResource = function (title, description, blob, options) {
    var self = this;
    var protocol = url.parse(this.config.endpoint).protocol || 'https:';
    var mediaClient = new Media(this.config);
    return mediaClient.apply(this.config.mode).then(function (res) {
        // bos endpoint 的协议跟随 this.config.endpoint
        var bosClient = new BosClient({
            endpoint: protocol + '//' + res.body.host,
            credentials: self.config.credentials,
            sessionToken: self.config.sessionToken
        });
        bosClient.on('progress', function (evt) {
            self.emit('progress', evt);
        });
        return helper.upload(bosClient, res.body.sourceBucket, res.body.sourceKey, blob, options);
    }).then(function () {
        return mediaClient.process(title, u.extend({description: description}, options));
    });
};

VodClient.prototype.getMediaResource = function (mediaId) {
    return new Media(this.config).setMediaId(mediaId).get();
};

VodClient.prototype.listMediaResource = function (options) {
    return new Media(this.config).list(options);
};

VodClient.prototype.listMediaResources = function (options) {
    return this.listMediaResource(options);
};

VodClient.prototype.updateMediaResource = function (mediaId, title, description) {
    return new Media(this.config).setMediaId(mediaId).update(title, description);
};

VodClient.prototype.stopMediaResource = function (mediaId, options) {
    return new Media(this.config).setMediaId(mediaId).disable();
};

VodClient.prototype.publishMediaResource = function (mediaId, options) {
    return new Media(this.config).setMediaId(mediaId).resume();
};

VodClient.prototype.deleteMediaResource = function (mediaId, options) {
    return new Media(this.config).setMediaId(mediaId).remove();
};

VodClient.prototype.getPlayableUrl = function (mediaId, transcodingPresetName) {
    return new Player(this.config).setMediaId(mediaId).delivery(transcodingPresetName);
};

VodClient.prototype.getDownloadUrl = function (mediaId, expiredInSeconds) {
    return new Media(this.config).getDownloadUrl(mediaId, expiredInSeconds);
};

VodClient.prototype.getPlayerCode = function (mediaId, width, height, autoStart, options) {
    return new Player(this.config).setMediaId(mediaId).code(u.extend({
        ak: this.config.credentials.ak,
        width: width,
        height: height,
        autostart: autoStart
    }, options));
};

VodClient.prototype._generateMediaId = function () {
    return new Media(this.config).apply();
};

VodClient.prototype._createMediaResource = function (mediaId, title, description, options) {
    return new Media(this.config).setMediaId(mediaId).process(title, u.extend({
        description: description
    }, options));
};
// --- E N D ---

VodClient.Media = Media;
VodClient.Notification = Notification;
VodClient.Player = Player;
VodClient.PresetGroup = PresetGroup;
VodClient.Statistic = Statistic;
VodClient.StrategyGroup = StrategyGroup;

module.exports = VodClient;

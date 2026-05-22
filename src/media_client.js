/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/media_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

var util = require('util');

var u = require('underscore');

var Auth = require('./auth');
var HttpClient = require('./http_client');
var BceBaseClient = require('./bce_base_client');

/**
 * Media service api.
 *
 * @constructor
 * @param {Object} config The media client configuration.
 * @extends {BceBaseClient}
 */
function MediaClient(config) {
    BceBaseClient.call(this, config, 'media', true);
}
util.inherits(MediaClient, BceBaseClient);


// --- B E G I N ---
MediaClient.prototype.createPipeline = function (pipelineName, sourceBucket, targetBucket,
    opt_config, opt_description, opt_options) {

    var url = '/v3/pipeline';
    var options = opt_options || {};
    var body = JSON.stringify({
        pipelineName: pipelineName,
        sourceBucket: sourceBucket,
        targetBucket: targetBucket,
        config: opt_config || {capacity: 5},
        description: opt_description || ''
    });

    return this.sendRequest('POST', url, {
        body: body,
        config: options.config
    });
};

MediaClient.prototype.getPipeline = function (pipelineName, opt_options) {
    var url = '/v3/pipeline/' + pipelineName;
    var options = opt_options || {};

    return this.sendRequest('GET', url, {config: options.config});
};

MediaClient.prototype.deletePipeline = function (pipelineName, opt_options) {
    var url = '/v3/pipeline/' + pipelineName;
    var options = opt_options || {};

    return this.sendRequest('DELETE', url, {config: options.config});
};

MediaClient.prototype.getAllPipelines = function (opt_options) {
    var url = '/v3/pipeline';
    var options = opt_options || {};

    return this.sendRequest('GET', url, {config: options.config});
};

MediaClient.prototype.createJob = function (pipelineName, source, target, presetName, opt_options) {
    var url = '/v3/job';
    var options = opt_options || {};
    var body = JSON.stringify({
        pipelineName: pipelineName,
        source: source,
        target: target,
        presetName: presetName
    });

    return this.sendRequest('POST', url, {
        body: body,
        config: options.config
    });
};

MediaClient.prototype.getAllJobs = function (pipelineName, opt_options) {
    var url = '/v3/job';
    var options = opt_options || {};
    var params = {pipelineName: pipelineName};

    return this.sendRequest('GET', url, {
        params: params,
        config: options.config
    });
};

MediaClient.prototype.getJob = function (jobId, opt_options) {
    var url = '/v3/job/' + jobId;
    var options = opt_options || {};

    return this.sendRequest('GET', url, {config: options.config});
};

/**
 * 创建模板, 不对外部用户开放，仅服务于Console.
 *
 * @param {string} presetName 转码模板名称.
 * @param {string} container 音视频文件的容器.
 * @param {Object=} clip 是否截取音视频片段.
 * @param {Object=} audio 音频输出信息的集合，不填写表示只处理视频部分.
 * @param {Object=} video 视频输出信息的集合，不填写表示只处理音频部分.
 * @param {Object=} opt_encryption HLS加解密信息的集合.
 * @param {boolean=} opt_transmux 是否仅执行容器格式转换.
 * @param {string=} opt_description 转码模板描述.
 * @param {Object=} opt_options Media Client 的配置.
 * @return {Q.promise}
 */
MediaClient.prototype.createPreset = function (presetName, container, clip, audio, video,
    opt_encryption, opt_transmux, opt_description, opt_options) {
    // container: mp4, flv, hls, mp3, m4a
    var url = '/v3/preset';
    var options = opt_options || {};
    var body = {
        presetName: presetName,
        container: container
    };
    clip && (body.clip = clip);
    audio && (body.audio = audio);
    video && (body.video = video);
    opt_encryption && (body.encryption = opt_encryption);
    opt_transmux != null && (body.transmux = opt_transmux);
    opt_description && (body.description = opt_description);

    return this.sendRequest('POST', url, {
        body: JSON.stringify(body),
        config: options.config
    });
};

MediaClient.prototype.getPreset = function (presetName, opt_options) {
    var url = '/v3/preset/' + presetName;
    var options = opt_options || {};

    return this.sendRequest('GET', url, {
        config: options.config
    });
};

MediaClient.prototype.deletePreset = function (presetName, opt_options) {
    var url = '/v3/preset/' + presetName;
    var options = opt_options || {};

    return this.sendRequest('DELETE', url, {
        config: options.config
    });
};

MediaClient.prototype.getMediainfo = function (bucket, key, opt_options) {
    var url = '/v3/mediainfo';
    var options = opt_options || {};
    var params = {
        bucket: bucket,
        key: key
    };

    return this.sendRequest('GET', url, {
        params: params,
        config: options.config
    });
};

MediaClient.prototype.getProgress = function () {
    var url = '/v3/statistic/job/realtime';
    return this.sendRequest('GET', url);
};

MediaClient.prototype.createSignature = function (credentials, httpMethod, path, params, headers) {
    var auth = new Auth(credentials.ak, credentials.sk);
    // 不能对content-type,content-length,content-md5进行签名
    // 不能对x-bce-request-id进行签名
    var headersToSign = ['host'];
    return auth.generateAuthorization(httpMethod, path, params, headers, 0, 0, headersToSign);
};
// --- E N D ---


MediaClient.prototype.sendRequest = function (httpMethod, resource, varArgs) {
    var defaultArgs = {
        bucketName: null,
        key: null,
        body: null,
        headers: {},
        params: {},
        config: {},
        outputStream: null
    };
    var args = u.extend(defaultArgs, varArgs);

    var config = u.extend({}, this.config, args.config);

    var client = this;
    var agent = this._httpAgent = new HttpClient(config);
    u.each(['progress', 'error', 'abort', 'timeout'], function (eventName) {
        agent.on(eventName, function (evt) {
            client.emit(eventName, evt);
        });
    });
    return this._httpAgent.sendRequest(httpMethod, resource, args.body,
        args.headers, args.params, u.bind(this.createSignature, this),
        args.outputStream
    );
};

module.exports = MediaClient;








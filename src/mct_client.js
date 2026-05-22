/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/mct_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint fecs-camelcase:[2,{"ignore":["/opt_/"]}] */

var util = require('util');

var Q = require('q');

var BceBaseClient = require('./bce_base_client');

/**
 * 水印接口（Watermark API）
 * http://bce.baidu.com/doc/MCT/API.html#.81.CC.4F.30.2C.F7.78.0E.AA.53.8E.85.5D.E2.77.BE
 *
 * @constructor
 * @param {Object} config The mct client configuration.
 * @extends {BceBaseClient}
 */
function Watermark(config) {
    BceBaseClient.call(this, config, 'media', true);

    this._id = null;
}
util.inherits(Watermark, BceBaseClient);

// --- B E G I N ---

Watermark.prototype._buildUrl = function (opt_id) {
    var url = '/v3/watermark';
    if (opt_id === false) {
        return url;
    }

    var id = opt_id || this._id;
    return url + (id ? '/' + id : '');
};

Watermark.prototype.setId = function (id) {
    this._id = id;
    return this;
};

Watermark.prototype.create = function (options) {
    var self = this;

    var url = self._buildUrl(false);
    return self.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        self.setId(response.body.watermarkId);
        return response;
    });
};

Watermark.prototype.remove = function (id) {
    var url = this._buildUrl(id);
    return this.sendRequest('DELETE', url);
};

Watermark.prototype.removeAll = function () {
    var self = this;
    return self.list().then(function (response) {
        var asyncTasks = response.body.watermarks
            .map(function (item) {
                return self.remove(item.watermarkId);
            });
        return Q.all(asyncTasks);
    });
};

Watermark.prototype.get = function (id) {
    var self = this;
    var url = self._buildUrl(id);
    return self.sendRequest('GET', url).then(function (response) {
        self.setId(response.body.watermarkId);
        return response;
    });
};

Watermark.prototype.list = function () {
    var url = this._buildUrl(false);
    return this.sendRequest('GET', url);
};

// --- E   N   D ---

/**
 * 媒体信息接口（MediaInfo API）
 * http://bce.baidu.com/doc/MCT/API.html#.D1.D4.44.23.BB.C5.88.34.9B.29.16.A6.4D.73.0A.96
 *
 * @constructor
 * @param {Object} config The mct client configuration.
 * @extends {BceBaseClient}
 */
function MediaInfo(config) {
    BceBaseClient.call(this, config, 'media', true);
}
util.inherits(MediaInfo, BceBaseClient);

// --- B E G I N ---

MediaInfo.prototype.get = function (bucket, key) {
    var url = '/v3/mediainfo';
    return this.sendRequest('GET', url, {
        params: {
            bucket: bucket,
            key: key
        }
    });
};

// --- E   N   D ---

/**
 * 队列接口（Pipeline API）
 * http://bce.baidu.com/doc/MCT/API.html#.7B.58.EA.E5.54.22.16.F1.32.84.E4.C4.36.04.37.3A
 *
 * @constructor
 * @param {Object} config The mct client configuration.
 * @extends {BceBaseClient}
 */
function Pipeline(config) {
    BceBaseClient.call(this, config, 'media', true);

    this._name = null;
}
util.inherits(Pipeline, BceBaseClient);

// --- B E G I N ---

Pipeline.prototype.setName = function (name) {
    this._name = name;
    return this;
};

Pipeline.prototype._buildUrl = function (opt_name) {
    var url = '/v3/pipeline';
    if (opt_name === false) {
        return url;
    }

    var key = opt_name || this._name;
    return url + (key ? '/' + key : '');
};

Pipeline.prototype.create = function (options) {
    var self = this;
    var url = self._buildUrl(false);

    return self.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        self.setName(options.pipelineName);
        return response;
    });
};

Pipeline.prototype.get = function (name) {
    var self = this;
    var url = self._buildUrl(name);
    return self.sendRequest('GET', url).then(function (response) {
        self.setName(response.body.pipelineName);
        return response;
    });
};

Pipeline.prototype.list = function () {
    var url = this._buildUrl(false);
    return this.sendRequest('GET', url);
};

Pipeline.prototype.remove = function (name) {
    var url = this._buildUrl(name);
    return this.sendRequest('DELETE', url);
};

Pipeline.prototype.removeAll = function () {
    var self = this;
    return self.list().then(function (response) {
        var asyncTasks = response.body.pipelines
            .filter(function (item) {
                // 有 running/pending 在运行的 Pipeline 无法删除
                var status = item.jobStatus;
                return (status.running + status.pending) <= 0;
            })
            .map(function (item) {
                return self.remove(item.pipelineName);
            });
        return Q.all(asyncTasks);
    });
};

Pipeline.prototype.addTranscodingJob = function (options) {
    var pipelineName = options.pipelineName || this._name;
    if (!pipelineName) {
        throw new Error('`pipelineName` is required.');
    }

    options.pipelineName = pipelineName;
    var job = new Transcoding(this.config);
    return job.create(options).then(function (response) {
        return job;
    });
};

Pipeline.prototype.addThumbnailJob = function (options) {
    var pipelineName = options.pipelineName || this._name;
    if (!pipelineName) {
        throw new Error('`pipelineName` is required.');
    }

    options.pipelineName = pipelineName;
    var job = new Thumbnail(this.config);
    return job.create(options).then(function (response) {
        return job;
    });
};

Pipeline.prototype.getTranscodingJobs = function (opt_name) {
    var name = opt_name || this._name;
    if (!name) {
        throw new Error('`pipelineName` is required.');
    }

    var transcoding = new Transcoding(this.config);
    return transcoding.list(name);
};

Pipeline.prototype.getThumbnailJobs = function (opt_name) {
    var name = opt_name || this._name;
    if (!name) {
        throw new Error('`pipelineName` is required');
    }

    var thumbnail = new Thumbnail(this.config);
    return thumbnail.list(name);
};

// --- E   N   D ---

/**
 * 模板接口（Preset API）
 * http://bce.baidu.com/doc/MCT/API.html#.AC.4A.44.2F.2C.0D.6D.25.0C.83.A0.AF.C6.32.E7.CA
 *
 * @constructor
 * @param {Object} config The mct client configuration.
 * @extends {BceBaseClient}
 */
function Preset(config) {
    BceBaseClient.call(this, config, 'media', true);

    /**
     * The preset name
     * @type {string}
     * @private
     */
    this._name = null;
}
util.inherits(Preset, BceBaseClient);

// --- B E G I N ---

Preset.prototype._buildUrl = function (opt_name) {
    var url = '/v3/preset';
    if (opt_name === false) {
        return url;
    }

    var name = opt_name || this._name;
    return url + (name ? '/' + name : '');
};

Preset.prototype.setName = function (name) {
    this._name = name;
    return this;
};

Preset.prototype.create = function (options) {
    var self = this;
    var url = this._buildUrl(false);

    return this.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        self.setName(options.presetName);
        return response;
    });
};

Preset.prototype.get = function (opt_name) {
    var self = this;
    var url = self._buildUrl(opt_name);
    return self.sendRequest('GET', url).then(function (response) {
        self.setName(response.body.presetName);
        return response;
    });
};

Preset.prototype.list = function () {
    var url = this._buildUrl(false);
    return this.sendRequest('GET', url);
};

Preset.prototype.remove = function (opt_name) {
    var url = this._buildUrl(opt_name);
    return this.sendRequest('DELETE', url);
};

Preset.prototype.removeAll = function () {
    var self = this;
    return self.list().then(function (response) {
        var asyncTasks = response.body.presets
            .filter(function (item) {
                return !/^bce\./.test(item.presetName);
            })
            .map(function (item) {
                return self.remove(item.presetName);
            });
        return Q.all(asyncTasks);
    });
};

// --- E   N   D ---

/**
 * 缩略图任务接口（Job/Thumbnail API）
 * http://bce.baidu.com/doc/MCT/API.html#.45.7A.76.DC.88.FD.32.92.D4.46.EA.48.3A.66.F0.12
 *
 * @constructor
 * @param {Object} config The mct client configuration.
 * @extends {BceBaseClient}
 */
function Thumbnail(config) {
    BceBaseClient.call(this, config, 'media', true);

    this._jobId = null;
}
util.inherits(Thumbnail, BceBaseClient);

// --- B E G I N ---
Thumbnail.prototype._buildUrl = function () {
    var url = '/v3/job/thumbnail';
    return url;
};

Thumbnail.prototype.create = function (options) {
    var self = this;
    var url = this._buildUrl();

    return this.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        self._jobId = response.body.jobId;
        return response;
    });
};

Thumbnail.prototype.get = function (opt_jobId) {
    var jobId = opt_jobId || this._jobId;
    if (!jobId) {
        throw new Error('`jobId` is required');
    }

    var self = this;
    var url = this._buildUrl() + '/' + jobId;
    return this.sendRequest('GET', url).then(function (response) {
        self._jobId = jobId;
        return response;
    });
};

Thumbnail.prototype.list = function (name) {
    var url = this._buildUrl();
    return this.sendRequest('GET', url, {
        params: {
            pipelineName: name
        }
    });
};

// --- E   N   D ---

/**
 * 视频转码任务接口（Job/Transcoding API）
 * http://bce.baidu.com/doc/MCT/API.html#.1D.1E.B0.1E.6C.74.0C.6D.C1.68.D2.57.6F.70.EA.F1
 *
 * @constructor
 * @param {Object} config The mct client configuration.
 * @extends {BceBaseClient}
 */
function Transcoding(config) {
    BceBaseClient.call(this, config, 'media', true);

    this._jobId = null;
}
util.inherits(Transcoding, BceBaseClient);

// --- B E G I N ---

Transcoding.prototype._buildUrl = function () {
    var url = '/v3/job/transcoding';
    return url;
};

Transcoding.prototype.create = function (options) {
    var self = this;
    var url = self._buildUrl();

    return self.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        self._jobId = response.body.jobId;
        return response;
    });
};

Transcoding.prototype.get = function (opt_jobId) {
    var jobId = opt_jobId || this._jobId;
    if (!jobId) {
        throw new Error('`jobId` is required');
    }

    var self = this;
    var url = self._buildUrl() + '/' + jobId;
    return self.sendRequest('GET', url).then(function (response) {
        self._jobId = jobId;
        return response;
    });
};

Transcoding.prototype.list = function (name) {
    var url = this._buildUrl();

    return this.sendRequest('GET', url, {
        params: {
            pipelineName: name
        }
    });
};

// --- E   N   D ---

exports.Watermark = Watermark;
exports.MediaInfo = MediaInfo;
exports.Transcoding = Transcoding;
exports.Thumbnail = Thumbnail;
exports.Pipeline = Pipeline;
exports.Preset = Preset;






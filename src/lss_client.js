/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/lss_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint fecs-camelcase:[2,{"ignore":["/opt_/"]}] */

var util = require('util');

var Q = require('q');
// var debug = require('debug')('bce-sdk:LssClient');

var BceBaseClient = require('./bce_base_client');

/**
 * 直播模板
 * http://bce.baidu.com/doc/LSS/API.html#.9E.2A.60.EA.11.C8.DD.82.F7.A6.B1.71.BC.C3.B7.68
 *
 * @constructor
 * @param {Object} config The lss client configuration.
 * @extends {BceBaseClient}
 */
function Preset(config) {
    BceBaseClient.call(this, config, 'lss', true);

    this._name = null;
}
util.inherits(Preset, BceBaseClient);

// --- B E G I N ---

Preset.prototype._buildUrl = function (name) {
    var url = '/v3/live/preset';
    return url + (name ? '/' + name : '');
};

Preset.prototype.setName = function (name) {
    this._name = name;
    return this;
};

Preset.prototype.create = function (options) {
    var self = this;

    var url = self._buildUrl(false);
    return self.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        self.setName(options.presetName);
        return response;
    });
};

Preset.prototype.remove = function (name) {
    var url = this._buildUrl(name || this._name);
    return this.sendRequest('DELETE', url);
};

Preset.prototype.removeAll = function () {
    var self = this;
    return self.list().then(function (response) {
        var asyncTasks = response.body.presets
            .filter(function (item) {
                // bce.~~ | lss.~~
                return !/^(bce|lss)\./.test(item.presetName);
            })
            .map(function (item) {
                return self.remove(item.presetName);
            });
        return Q.all(asyncTasks);
    });
};

Preset.prototype.get = function (name) {
    var url = this._buildUrl(name || this._name);
    return this.sendRequest('GET', url);
};

Preset.prototype.list = function () {
    var url = this._buildUrl();
    return this.sendRequest('GET', url);
};

// --- E   N   D ---

/**
 * 直播会话接口（Live Session API）
 * http://bce.baidu.com/doc/LSS/API.html#.23.14.D5.44.EE.00.30.BA.DB.38.4B.3D.1E.12.15.C3
 *
 * @constructor
 * @param {Object} config The lss client configuration.
 * @extends {BceBaseClient}
 */
function Session(config) {
    BceBaseClient.call(this, config, 'lss', true);

    /**
     * The session id.
     *
     * @private
     * @type {string}
     */
    this._sessionId = null;
}
util.inherits(Session, BceBaseClient);

// --- B E G I N ---

Session.prototype._buildUrl = function (sessionId) {
    var url = '/v3/live/session';
    return url + (sessionId ? '/' + sessionId : '');
};

/**
 * 设置当前 Session 的 Id.
 *
 * @param {string} sessionId The session id.
 * @return {Session}
 */
Session.prototype.setSessionId = function (sessionId) {
    this._sessionId = sessionId;
    return this;
};

Session.prototype.create = function (options) {
    var self = this;

    var url = self._buildUrl(false);
    return self.sendRequest('POST', url, {
        body: JSON.stringify(options)
    }).then(function (response) {
        var session = response.body;
        self.setSessionId(session.sessionId);
        return response;
    });
};

Session.prototype.remove = function (sessionId) {
    var url = this._buildUrl(sessionId || this._sessionId);
    return this.sendRequest('DELETE', url);
};

Session.prototype.removeAll = function () {
    var self = this;
    return self.list().then(function (response) {
        var asyncTasks = response.body.liveInfos.map(function (item) {
            return self.remove(item.sessionId);
        });
        return Q.all(asyncTasks);
    });
};

Session.prototype.get = function (sessionId) {
    var url = this._buildUrl(sessionId || this._sessionId);
    return this.sendRequest('GET', url);
};

Session.prototype.list = function () {
    var url = this._buildUrl();
    return this.sendRequest('GET', url);
};

Session.prototype.pause = function (sessionId) {
    var url = this._buildUrl(sessionId || this._sessionId);
    return this.sendRequest('PUT', url, {
        params: {stop: ''}
    });
};

Session.prototype.resume = function (sessionId) {
    var url = this._buildUrl(sessionId || this._sessionId);
    return this.sendRequest('PUT', url, {
        params: {resume: ''}
    });
};

Session.prototype.refresh = function (sessionId) {
    var url = this._buildUrl(sessionId || this._sessionId);
    return this.sendRequest('PUT', url, {
        params: {refresh: ''}
    });
};

// --- E   N   D ---

/**
 * 直播通知接口（Live Notification API）
 * http://bce.baidu.com/doc/LSS/API.html#.72.90.9D.94.D6.1A.76.02.A5.A9.63.B2.32.A8.E7.2C
 *
 * @constructor
 * @param {Object} config The lss client configuration.
 * @extends {BceBaseClient}
 */
function Notification(config) {
    BceBaseClient.call(this, config, 'lss', true);

    this._name = null;
    this._endpoint = null;
}
util.inherits(Notification, BceBaseClient);

// --- B E G I N ---

Notification.prototype._buildUrl = function (name) {
    var url = '/v3/live/notification';
    return url + (name ? '/' + name : '');
};

Notification.prototype.create = function (name, endpoint) {
    var url = this._buildUrl();

    var data = {
        name: name,
        endpoint: endpoint
    };

    var self = this;
    return this.sendRequest('POST', url, {
        body: JSON.stringify(data)
    }).then(function (response) {
        self._name = name;
        self._endpoint = endpoint;
        return response;
    });
};

Notification.prototype.get = function (opt_name) {
    var name = opt_name || this._name;
    if (!name) {
        throw new TypeError('name is required');
    }

    var url = this._buildUrl(name);
    return this.sendRequest('GET', url);
};

Notification.prototype.remove = function (opt_name) {
    var name = opt_name || this._name;
    if (!name) {
        throw new TypeError('name is required');
    }

    var url = this._buildUrl(name);
    return this.sendRequest('DELETE', url);
};

Notification.prototype.removeAll = function () {
    var self = this;
    return self.list().then(function (response) {
        var asyncTasks = (response.body.notifications || []).map(function (item) {
            return self.remove(item.name);
        });
        return Q.all(asyncTasks);
    });
};

Notification.prototype.list = function () {
    var url = this._buildUrl();
    return this.sendRequest('GET', url);
};

// --- E   N   D ---

exports.Preset = Preset;
exports.Session = Session;
exports.Notification = Notification;






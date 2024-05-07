/**
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * @file src/bce_base_client.js
 * @author leeight
 */

/* eslint-env node */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Q = require('q');
var u = require('underscore');

var config = require('./config');
var Auth = require('./auth');
var HttpClient = require('./http_client');
var H = require('./headers');

/**
 * @typedef {import('./http_client.js').BceConfig} BceConfig
 */

/**
 * BceBaseClient
 *
 * @constructor
 * @param {BceConfig} clientConfig The bce client configuration.
 * @param {string} serviceId The service id.
 * @param {boolean=} regionSupported The service supported region or not.
 */
function BceBaseClient(clientConfig, serviceId, regionSupported) {
    EventEmitter.call(this);

    this.config = u.extend({}, config.DEFAULT_CONFIG, clientConfig);
    this.serviceId = serviceId;
    this.regionSupported = !!regionSupported;

    this.config.endpoint = this._computeEndpoint();

    /**
     * @type {HttpClient}
     */
    this._httpAgent = null;
}
util.inherits(BceBaseClient, EventEmitter);

BceBaseClient.prototype._computeEndpoint = function () {
    if (this.config.endpoint) {
        return this.config.endpoint;
    }

    if (this.regionSupported) {
        return util.format('%s://%s.%s.%s',
            this.config.protocol,
            this.serviceId,
            this.config.region,
            config.DEFAULT_SERVICE_DOMAIN);
    }
    return util.format('%s://%s.%s',
        this.config.protocol,
        this.serviceId,
        config.DEFAULT_SERVICE_DOMAIN);
};

BceBaseClient.prototype.createSignature = function (credentials, httpMethod, path, params, headers) {
    var revisionTimestamp = Date.now() + (this.timeOffset || 0);

    headers[H.X_BCE_DATE] = new Date(revisionTimestamp).toISOString().replace(/\.\d+Z$/, 'Z');

    return Q.fcall(function () {
        var auth = new Auth(credentials.ak, credentials.sk);
        return auth.generateAuthorization(httpMethod, path, params, headers, revisionTimestamp / 1000);
    });
};

BceBaseClient.prototype.sendRequest = function (httpMethod, resource, varArgs) {
    var defaultArgs = {
        body: null,
        headers: {},
        params: {},
        config: {},
        outputStream: null
    };
    var args = u.extend(defaultArgs, varArgs);

    var config = u.extend({}, this.config, args.config);
    if (config.sessionToken) {
        args.headers[H.SESSION_TOKEN] = config.sessionToken;
    }

    return this.sendHTTPRequest(httpMethod, resource, args, config);
};

BceBaseClient.prototype.sendHTTPRequest = function (httpMethod, resource, args, config) {
    var client = this;

    function doRequest() {
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
    }

    return doRequest.call(client).catch(function(err) {
        var serverTimestamp = new Date(err[H.X_BCE_DATE]).getTime();

        BceBaseClient.prototype.timeOffset = serverTimestamp - Date.now();

        if (err[H.X_STATUS_CODE] === 403 && err[H.X_CODE] === 'RequestTimeTooSkewed') {
            return doRequest.call(client);
        }

        return Q.reject(err);
    });
};

module.exports = BceBaseClient;


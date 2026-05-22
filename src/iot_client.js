/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
/**
 * Baidu Cloud IOT SDK
 *
 * @file src/iot_client.js
 * @author fjx
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');
var path = require('path');
var u = require('underscore');

var strings = require('./strings');
var BceBaseClient =  require('./bce_base_client');

/**
 * IOT Hub API
 *
 * @see https://cloud.baidu.com/doc/IOT/API.html
 * @constructor
 * @param {Object} config The iot client configuration.
 * @extends {BceBaseClient}
 */
function IoTClient(config) {
    BceBaseClient.call(this, config, 'iot', true);
}
util.inherits(IoTClient, BceBaseClient);

// --- BEGIN ---

// GET /v1/usage
IoTClient.prototype.getUsage = function (options) {
    options = options || {};

    return this.sendRequest('GET', '/v1/usage', {
        config: options.config
    });
};

// GET /v1/endpoint/:endpointName/usage
IoTClient.prototype.getEndpointUsage = function (endpointName, options) {
    options = options || {};

    return this.sendRequest('GET', '/v1/endpoint/' + endpointName + '/usage', {
        config: options.config
    });
};

// POST /v1/endpoint/:endpointName/usage-query?start=:startDate&end=:endDate
IoTClient.prototype.getEndpointUsageRange = function (endpointName, startDate, endDate, options) {
    options = options || {};

    var resource = this._buildUrl(
        '/v1/endpoint/',
        strings.normalize(endpointName || ''),
        '/usage-query'
    );

    return this.sendRequest('POST', resource, {
        params: {
            start: startDate,
            end: endDate
        },
        config: options.config
    });
};

// GET /v2/endpoint/{endpointName}/client/{clientId}/status/online
IoTClient.prototype.getClientOnline = function (endpointName, clientId, options) {
    options = options || {};

    var resource = this._buildUrl(
        '/v2/endpoint',
        strings.normalize(endpointName || ''),
        '/client',
        strings.normalize(clientId || '', false),
        '/status/online'
    );

    return this.sendRequest('GET', resource, {
        config: options.config
    });
};

// POST /v2/endpoint/{endpointName}/batch-client-query/status
IoTClient.prototype.getClientOnlineBatch = function (endpointName, clientIds, options) {
    options = options || {};

    var resource = this._buildUrl(
        '/v2/endpoint',
        strings.normalize(endpointName || ''),
        '/batch-client-query/status'
    );

    return this.sendRequest('POST', resource, {
        body: JSON.stringify(clientIds || []),
        config: options.config
    });
};

IoTClient.prototype._buildUrl = function () {
    var extraPaths = u.toArray(arguments);

    return path.normalize(extraPaths.join('/')).replace(/\\/g, '/');
};

// --- E N D ---

module.exports = IoTClient;

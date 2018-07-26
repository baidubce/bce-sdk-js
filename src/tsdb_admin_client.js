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
 * @file src/tsdb_admin_client.js
 * @author lidandan
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');
var u = require('underscore');

var HttpClient = require('./http_client');
var BceBaseClient = require('./bce_base_client');

/**
 *TSDB_Admin service api
 *
 * @class
 * @param {Object} config The tsdb_admin client configuration.
 * @extends {BceBaseClient}
 */
function TsdbAdminClient(config) {
    BceBaseClient.call(this, config, 'tsdb', true);

    /**
     * @type {HttpClient}
     */
    this._httpAgent = null;
}
util.inherits(TsdbAdminClient, BceBaseClient);

// --- B E G I N ---

TsdbAdminClient.prototype.createDatabase = function (clientToken, databaseName,
    ingestDataPointsMonthly, purchaseLength, description, couponName, storeBytesQuota, options) {
    options = options || {};
    var url = '/v1/database';
    var params = {
        clientToken: clientToken
    };

    return this.sendRequest('POST', url, {
        params: params,
        body: JSON.stringify({
            databaseName: databaseName,
            ingestDataPointsMonthly: ingestDataPointsMonthly,
            storeBytesQuota: storeBytesQuota,
            purchaseLength: purchaseLength,
            couponName: couponName,
            description: description
        }),
        headers: options.headers,
        config: options.config
    });
};

TsdbAdminClient.prototype.deleteDatabase = function (databaseId, options) {
    options = options || {};
    var url = '/v1/database/' + databaseId;
    var params = {
        databaseId: databaseId,
        query: ''
    };

    return this.sendRequest('DELETE', url, {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbAdminClient.prototype.getDatabaseInfo = function (databaseId, options) {
    options = options || {};
    var url = '/v1/database/' + databaseId;
    var params = {
        databaseId: databaseId,
        query: ''
    };

    return this.sendRequest('GET', url, {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbAdminClient.prototype.listDatabase = function (options) {
    options = options || {};
    var url = '/v1/database';
    var params = {
        query: ''
    };

    return this.sendRequest('GET', url, {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

// --- E N D ---

TsdbAdminClient.prototype.sendRequest = function (httpMethod, resource, varArgs) {
    var defaultArgs = {
        metricName: null,
        database: null,
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
    var httpContext = {
        httpMethod: httpMethod,
        resource: resource,
        args: args,
        config: config
    };
    u.each(['progress', 'error', 'abort'], function (eventName) {
        agent.on(eventName, function (evt) {
            client.emit(eventName, evt, httpContext);
        });
    });

    return this._httpAgent.sendRequest(httpMethod, resource, args.body,
        args.headers, args.params, u.bind(this.createSignature, this),
        args.outputStream
    );
};
module.exports = TsdbAdminClient;

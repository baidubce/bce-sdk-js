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
 * @file src/tsdb_data_client.js
 * @author lidandan
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');
var u = require('underscore');
var qs = require('querystring');
var zlib = require('zlib');

var H = require('./headers');
var Auth = require('./auth.js');
var HttpClient = require('./http_client');
var BceBaseClient = require('./bce_base_client');

/**
 * TSDB_Data service api
 *
 * @class
 * @param {Object} config The tsdb_data client configuration.
 * @extends {BceBaseClient}
 */
function TsdbDataClient(config) {
    BceBaseClient.call(this, config, 'tsdb', true);

    /**
     * @type {HttpClient}
     */
    this._httpAgent = null;
}
util.inherits(TsdbDataClient, BceBaseClient);

// --- B E G I N ---

TsdbDataClient.prototype.writeDatapoints = function (datapoints, useGzip, options) {
    options = options || {};
    var params = {
        query: ''
    };
    var url = '/v1/datapoint';
    var body = JSON.stringify({datapoints: datapoints});
    if (useGzip != false) {
        body = zlib.gzipSync(body);
        options.headers = options.headers || {};
        options.headers[H.CONTENT_ENCODING] = 'gzip';
    }
    return this.sendRequest('POST', url, {
        body: body,
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbDataClient.prototype.getMetrics = function (options) {
    options = options || {};
    var params = {
        query: ''
    };

    return this.sendRequest('GET', '/v1/metric', {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbDataClient.prototype.getTags = function (metricName, options) {
    options = options || {};
    var url = '/v1/metric/' + metricName + '/tag';
    var params = {
        metricName: metricName,
        query: ''
    };

    return this.sendRequest('GET', url, {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbDataClient.prototype.getFields = function (metricName, options) {
    var url = '/v1/metric/' + metricName + '/field';
    var params = {
        metricName: metricName,
        query: ''
    };

    return this.sendRequest('GET', url, {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbDataClient.prototype.getDatapoints = function (queryList, options) {
    var url = '/v1/datapoint';
    var params = u.extend({
            query: '',
            disablePresampling: false
        },
        u.pick(options, 'disablePresampling')
    );
    return this.sendRequest('PUT', url, {
        body: JSON.stringify({queries: queryList}),
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbDataClient.prototype.getRowsWithSql = function (sql, options) {
    var url = '/v1/row';
    var params = u.extend({
            sql: sql
    });
    return this.sendRequest('GET', url, {
        params: params,
        headers: options.headers,
        config: options.config
    });
};

TsdbDataClient.prototype.generatePresignedUrl = function (queryList, timestamp,
                                                     expirationInSeconds, headers, params, headersToSign, config) {
    var resource = '/v1/datapoint';
    config = u.extend({}, this.config, config);
    params = u.extend({
        query: JSON.stringify({queries: queryList}),
        disablePresampling: false
    }, u.pick(params, 'disablePresampling'));
    headers = headers || {};
    headers.Host = require('url').parse(config.endpoint).host;

    var credentials = config.credentials;
    var auth = new Auth(credentials.ak, credentials.sk);
    var authorization = auth.generateAuthorization(
        'GET', resource, params, headers, timestamp, expirationInSeconds,
        headersToSign);
    params.authorization = authorization;

    return util.format('%s%s?%s', config.endpoint, resource, qs.encode(params));
};

TsdbDataClient.prototype.generatePresignedUrlWithSql = function (sql, timestamp,
                                                     expirationInSeconds, headers, params, headersToSign, config) {
    var resource = '/v1/row';
    config = u.extend({}, this.config, config);
    params = u.extend({
        sql: sql
    });
    headers = headers || {};
    headers.Host = require('url').parse(config.endpoint).host;

    var credentials = config.credentials;
    var auth = new Auth(credentials.ak, credentials.sk);
    var authorization = auth.generateAuthorization(
        'GET', resource, params, headers, timestamp, expirationInSeconds,
        headersToSign);
    params.authorization = authorization;

    return util.format('%s%s?%s', config.endpoint, resource, qs.encode(params));
};

TsdbDataClient.prototype.createSignature = function (credentials, httpMethod, path, params, headers) {
    var auth = new Auth(credentials.ak, credentials.sk);
    // 不能对content-type,content-length,content-md5进行签名
    // 不能对x-bce-request-id进行签名
    var headersToSign = ['host'];

    return auth.generateAuthorization(httpMethod, path, params, headers, 0, 0, headersToSign);
};

// --- E N D ---

TsdbDataClient.prototype.sendRequest = function (httpMethod, resource, varArgs) {
    var defaultArgs = {
        metricName: null,
        key: null,
        body: null,
        headers: {'Content-Type': 'application/json; charset=UTF-8'},
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
module.exports = TsdbDataClient;


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
 * @file src/doc_client.js
 * @author guofan
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint fecs-camelcase:[2,{"ignore":["/opt_/"]}] */

var util = require('util');

var Q = require('q');
var u = require('underscore');
var H = require('./headers');
var BosClient = require('./bos_client');
var HttpClient = require('./http_client');
var BceBaseClient = require('./bce_base_client');

/**
 * 文档转码任务接口（Job/Transcoding API）
 * http://bce.baidu.com/doc/DOC/API.html#.1D.1E.B0.1E.6C.74.0C.6D.C1.68.D2.57.6F.70.EA.F1
 *
 * @constructor
 * @param {Object} config The doc client configuration.
 * @extends {BceBaseClient}
 */
function DocClient(config) {
    BceBaseClient.call(this, config, 'doc', false);
    this._config = config;
    this._documentId = null;
}
util.inherits(DocClient, BceBaseClient);

// --- B E G I N ---

DocClient.prototype._buildUrl = function () {
    return '/v1/document';
};

DocClient.prototype.createDocumentFromBlob = function (file, options) {
    var self = this;
    options = options || {};
    // calc md5 and sizeInBytes
    var filename = file.name;
    var tokens = filename.split('.');
    var format = tokens.pop();
    var title = tokens.join('.');

    if (!options.format) {
        options.format = format;
    }
    if (!options.title) {
        options.title = title;
    }
    options.meta = {};
    options.meta.sizeInBytes = file.size;

    var deffered = function (file) {
        var deferred = Q.defer();

        var reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = function (e) {
            if (e.target.readyState === FileReader.DONE) {
                var content = e.target.result;
                deferred.resolve(content);
            }
        };
        return deferred.promise;
    };
    return deffered(file).then(function (content) {
        options.meta.md5 = require('./crypto').md5sum(content, 0, 'hex');
        return doPromise();
    });
    function doPromise() {
        // register
        return self.registerDocument(options).then(function (response) {
            var regResult = response.body;
            // upload
            var bosConfig = JSON.parse(JSON.stringify(self._config));
            bosConfig.endpoint = regResult.bosEndpoint;
            var bosClient = new BosClient(bosConfig);

            return bosClient.putObjectFromBlob(regResult.bucket, regResult.object, file).then(function () {
                return self.publishDocument(regResult.documentId);
            });
        });
    }
};

DocClient.prototype.registerDocument = function (options) {
    var self = this;
    var url = self._buildUrl();
    return self.sendRequest('POST', url, {
        params: {register: ''},
        body: JSON.stringify(options)
    });
};

DocClient.prototype.publishDocument = function (documentId) {
    var self = this;
    var url = self._buildUrl();
    url = url + '/' + documentId;
    return self.sendRequest('PUT', url, {
        params: {publish: ''}
    })
};

// --- E   N   D ---

DocClient.prototype.sendRequest = function (httpMethod, resource, varArgs) {
    var defaultArgs = {
        body: null,
        headers: {},
        params: {},
        config: {}
    };
    var args = u.extend(defaultArgs, varArgs);

    var config = u.extend({}, this.config, args.config);

    var client = this;
    var agent = this._httpAgent = new HttpClient(config);
    u.each(['progress', 'error', 'abort'], function (eventName) {
        agent.on(eventName, function (evt) {
            client.emit(eventName, evt);
        });
    });
    if (config.sessionToken) {
        args.headers[H.SESSION_TOKEN] = config.sessionToken;
    }
    return this._httpAgent.sendRequest(httpMethod, resource, args.body,
        args.headers, args.params, u.bind(this.createSignature, this),
        args.outputStream
    );
};

// exports.DocClient = DocClient;
module.exports = DocClient;

/* vim: set ts=4 sw=4 sts=4 tw=120: */

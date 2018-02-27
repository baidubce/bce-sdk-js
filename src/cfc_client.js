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
 * @file src/cfc_client.js
 * @author marspanda
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint fecs-camelcase:[2,{"ignore":["/opt_/"]}] */

var util = require('util');

var u = require('underscore');
var debug = require('debug')('bce-sdk:CfcClient');

var BceBaseClient = require('./bce_base_client');

/**
 * CFC service api
 *
 *
 * @see https://cloud.baidu.com/doc/CFC/API.html 简介
 *
 * @constructor
 * @param {Object} config The cfc client configuration.
 * @extends {BceBaseClient}
 */
function CfcClient(config) {
    BceBaseClient.call(this, config, 'cfc', true);
}

util.inherits(CfcClient, BceBaseClient);

// BRN BEGIN
var exp1 = /^([a-zA-Z0-9-_\.]+)$/;
var exp2 = /^(brn:(.*))$/;
var exp3 = /^([a-zA-Z0-9]+:[a-zA-Z0-9-_\.]+)$/;

function dealFunctionName(fname) {
    var data = {
        thumbnailName: fname,
        version: '',
        uid: ''
    };
    if (exp1.test(fname)) {
        data.thumbnailName = fname;
        return data;
    }
    else if (exp2.test(fname)) {
        var brn = fname.split(':');
        if (brn.length < 6) {
            return data;
        }
        data.uid = brn[4];
        if (brn.length === 7) {
            data.thumbnailName = brn[6];
        }
        else if (brn.length === 8) {
            data.thumbnailName = brn[6];
            data.version = brn[7];
        }
        return data;
    }
    else if (exp3.test(fname)) {
        var resource = fname.split(':');
        if (resource.length === 2) {
            data.thumbnailName = resource[1];
            data.uid = resource[0];
        }
        return data;
    }
    return data;
}

// BRN END

// --- BEGIN ---

CfcClient.prototype.listFunctions = function (opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'marker')
    );
    debug('params ', params);
    return this.sendRequest('GET', '/v1/functions', {
        params: params,
        config: options.config
    });
};

CfcClient.prototype.createFunction = function (body) {
    /**
     var body =
     {
       'Code': {
         'ZipFile': 'string',
         'Publish': false,
         'DryRun': true
       },
       'Description': 'string',
       'Region': 'string',
       'Timeout': 0,
       'FunctionName': 'string',
       'Handler': 'string',
       'Runtime': 'string',
       'MemorySize':128,
       'Environment': {
         'Variables': {
           'additionalProp1': 'string',
           'additionalProp2': 'string',
           'additionalProp3': 'string'
         }
       }
     };
     */
    debug('createFunction, body = %j', body);

    return this.sendRequest('POST', '/v1/functions', {
        params: {},
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.getFunction = function (functionName, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Qualifier')
    );
    return this.sendRequest('GET', '/v1/functions/' + functionName, {
        params: params
    });
};

CfcClient.prototype.deleteFunction = function (functionName) {
    return this.sendRequest('DELETE', '/v1/functions/' + functionName, {});
};

CfcClient.prototype.invocations = function (functionName, body, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Qualifier', 'logToBody', 'invocationType', 'logType')
    );
    /**
     var body =  {
        'key3': 'value3',
        'key2': 'value2',
        'key1': 'value1'
    }
     */
    var data = dealFunctionName(functionName);
    return this.sendRequest('POST', '/v1/functions/' + data.thumbnailName + '/invocations', {
        params: params,
        body: JSON.stringify(body)
    });
};


CfcClient.prototype.updateFunctionCode = function (functionName, body) {
    /**
     var body =  {
      'ZipFile': blob,
      'Publish': false,
      'DryRun': true
    }
     */
    return this.sendRequest('PUT', '/v1/functions/' + functionName + '/code', {
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.getFunctionConfiguration = function (functionName, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Qualifier')
    );
    return this.sendRequest('GET', '/v1/functions/' + functionName + '/configuration', {
        params: params
    });
};

CfcClient.prototype.updateFunctionConfiguration = function (functionName, body) {
    /**
     var body = {
          'Description': 'string',
          'Timeout': 0,
          'Handler': 'string',
          'Runtime': 'string',
          'Environment': {
            'Variables': {
              'additionalProp1': 'string',
              'additionalProp2': 'string',
              'additionalProp3': 'string'
            }
          }
        }
     */
    return this.sendRequest('PUT', '/v1/functions/' + functionName + '/configuration', {
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.listVersionsByFunction = function (functionName, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Marker', 'MaxItems')
    );
    var data = dealFunctionName(functionName);
    return this.sendRequest('GET', '/v1/functions/' + data.thumbnailName + '/versions', {
        params: params
    });
};
CfcClient.prototype.publishVersion = function (functionName, description) {
    var body = {};
    if (description != null) {
        body.Description = description;
    }
    var data = dealFunctionName(functionName);
    return this.sendRequest('POST', '/v1/functions/' + data.thumbnailName + '/versions', {
        body: JSON.stringify(body)
    });
};
CfcClient.prototype.createAlias = function (functionName, body) {
    /**
     var body = {
            'FunctionVersion': 'string',
            'Name': 'string',
            'Description': 'string'
        }
     */
    return this.sendRequest('POST', '/v1/functions/' + functionName + '/aliases', {
        body: JSON.stringify(body)
    });
};
CfcClient.prototype.getAlias = function (functionName, aliasName) {
    return this.sendRequest('GET', '/v1/functions/' + functionName + '/aliases/' + aliasName, {});
};

CfcClient.prototype.updateAlias = function (functionName, aliasName, body) {
    /**
     var body = {
            'FunctionVersion': 'string',
            'Description': 'string'
        }
     */
    return this.sendRequest('PUT', '/v1/functions/' + functionName + '/aliases/' + aliasName, {
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.deleteAlias = function (functionName, aliasName) {
    return this.sendRequest('DELETE', '/v1/functions/' + functionName + '/aliases/' + aliasName, {});
};

CfcClient.prototype.listAliases = function (functionName, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'FunctionVersion', 'Marker', 'MaxItems')
    );
    return this.sendRequest('GET', '/v1/functions/' + functionName + '/aliases/', {
        params: params
    });
};

module.exports = CfcClient;



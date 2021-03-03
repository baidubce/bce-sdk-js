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
var strings = require('./strings');

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

// --- BEGIN ---

CfcClient.prototype.listFunctions = function (opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Marker', 'MaxItems')
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
    return this.sendRequest('GET', '/v1/functions/' + strings.normalize(functionName), {
        params: params
    });
};

CfcClient.prototype.deleteFunction = function (functionName, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Qualifier')
    );
    return this.sendRequest('DELETE', '/v1/functions/' + functionName, {
        params: params
    });
};

CfcClient.prototype.invocations = function (functionName, body, opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Qualifier', 'invocationType', 'logType', 'logToBody')
    );
    /**
     var body =  {
        'key3': 'value3',
        'key2': 'value2',
        'key1': 'value1'
    }
     */
    return this.sendRequest('POST', '/v1/functions/' + strings.normalize(functionName) + '/invocations', {
        params: params,
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.invoke = CfcClient.prototype.invocations;

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
    return this.sendRequest('GET', '/v1/functions/' + functionName + '/versions', {
        params: params
    });
};
CfcClient.prototype.publishVersion = function (functionName, description) {
    var body = {};
    if (description != null) {
        body.Description = description;
    }
    return this.sendRequest('POST', '/v1/functions/' + functionName + '/versions', {
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

CfcClient.prototype.listRelations = function (opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'FunctionBrn')
    );

    return this.sendRequest('GET', '/v1/relation', {
        params: params,
    });
};

CfcClient.prototype.createRelation = function (body, opt_options) {
    /**
     var body =
     {
       'Target': 'string',
       'Source': 'string',
       'Data': {
         'Resource': 'string',
         'Status': 'string',
         'EventType': 'string'
         'Name': 'string'
       },
     };
     */
    debug('createRelation, body = %j', body);

    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'FunctionBrn')
    );

    return this.sendRequest('POST', '/v1/relation', {
        // params: params,
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.updateRelation = function (body) {
    /**
     var body = {
          'RelationId': 'string',
          'Target': 'string',
          'Source': 'string',          
          'Data': {
            'Resource': 'string',
            'Status': 'string',
            'EventType': 'string'
            'Name': 'string'
          }
        }
     */

    return this.sendRequest('PUT', '/v1/relation', {
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.deleteRelation = function (opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'Target', 'Source', 'RelationId')
    );
    return this.sendRequest('DELETE', '/v1/relation', {
        params: params
    });
};


CfcClient.prototype.listEventSourceMappings = function (opt_options) {
    var options = opt_options || {};
    var params = u.extend(
        u.pick(options, 'FunctionName')
    );

    return this.sendRequest('GET', '/v1/event-source-mappings', {
        params: params,
    });
};

CfcClient.prototype.createEventSourceMapping = function (body) {
    /**
     var body =
     {
        BatchSize: 100
        Enabled: true
        EventSourceBrn: "42f6fbc2cd374bfcb80d9967370fd8ff__qa_preonline_cfc"
        FunctionName: "brn:bce:cfc:bj:1a2cbf55b97ac8a7c760c4177db4e17d:function:html:$LATEST"
        Source: "kafka"
        StartingPosition: "TRIM_HORIZON"
    }
     */
    debug('createEventSourceMapping, body = %j', body);

    return this.sendRequest('POST', '/v1/event-source-mappings', {
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.updateEventSourceMapping = function (esmId, body) {
    /**
     var body = {
            BatchSize: 100
            Enabled: false
            FunctionName: "brn:bce:cfc:bj:1a2cbf55b97ac8a7c760c4177db4e17d:function:html:$LATEST"
        }
     */
    return this.sendRequest('PUT', '/v1/event-source-mappings/' + esmId, {
        body: JSON.stringify(body)
    });
};

CfcClient.prototype.deleteEventSourceMapping = function (esmId) {
    return this.sendRequest('DELETE', '/v1/event-source-mappings/' + esmId, {});
};


CfcClient.prototype.sendRequest = function (httpMethod, resource, varArgs) {
    if (this.config.workspaceId) {
        if (!varArgs.headers) {
            varArgs.headers = {};
        }
        varArgs.headers['X-CFC-Workspace-Id'] = this.config.workspaceId;
    }
    return BceBaseClient.prototype.sendRequest.call(this, httpMethod, resource, varArgs);
};

module.exports = CfcClient;



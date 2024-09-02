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
 * @file src/aihc_client.js
 * @author atorber
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint fecs-camelcase:[2,{"ignore":["/opt_/"]}] */

var util = require('util');

var u = require('underscore');
var debug = require('debug')('bce-sdk:AihcClient');

var BceBaseClient = require('./bce_base_client');

/**
 * AIHC service api
 *
 * @see https://cloud.baidu.com/doc/AIHC/s/dly5i8vfs
 *
 * @constructor
 * @param {Object} config The aihc client configuration.
 * @extends {BceBaseClient}
 */
function AihcClient(config) {
  BceBaseClient.call(this, config, 'aihc', true);
}
util.inherits(AihcClient, BceBaseClient);

// --- BEGIN ---

function abstractMethod() {
  throw new Error('unimplemented method');
}

// GET 资源池列表
AihcClient.prototype.listResourcepools = function (opt_options) {
  var options = opt_options || {};
  var params = u.extend({maxKeys: 1000}, u.pick(options, 'maxKeys', 'marker'));

  return this.sendRequest('GET', '/api/v1/resourcepools', {
    params: params,
    config: options.config
  });
};

// GET 资源池详情
AihcClient.prototype.getResourcepool = function (resourcePoolId, opt_options) {
  var options = opt_options || {};

  return this.sendRequest('GET', `/api/v1/resourcepools/${resourcePoolId}`, {
    config: options.config
  });
};

// GET 资源池节点列表
AihcClient.prototype.listResourcepoolNodes = function (resourcePoolId, opt_options) {
  var options = opt_options || {};
  var params = u.extend({maxKeys: 1000}, u.pick(options, 'maxKeys', 'marker'));

  return this.sendRequest('GET', `/api/v1/resourcepools/${resourcePoolId}/nodes`, {
    params: params,
    config: options.config
  });
};

// GET 队列列表
AihcClient.prototype.listResourcepoolQueues = function (resourcePoolId, opt_options) {
  var options = opt_options || {};
  var params = u.extend({maxKeys: 1000}, u.pick(options, 'maxKeys', 'marker'));

  return this.sendRequest('GET', `/api/v1/resourcepools/${resourcePoolId}/queue`, {
    params: params,
    config: options.config
  });
};

// GET 队列详情
AihcClient.prototype.getResourcepoolQueue = function (resourcePoolId, queueName, opt_options) {
  var options = opt_options || {};

  return this.sendRequest('GET', `/api/v1/resourcepools/${resourcePoolId}/queue/${queueName}`, {
    config: options.config
  });
};

// DELETE 队列删除
AihcClient.prototype.deleteResourcepoolQueue = function (resourcePoolId, queueName, opt_options) {
  var options = opt_options || {};

  return this.sendRequest('DELETE', `/api/v1/resourcepools/${resourcePoolId}/queue/${queueName}`, {
    config: options.config
  });
};

// POST 队列创建
AihcClient.prototype.createResourcepoolQueue = function (resourcePoolId, body, opt_options) {
  var me = this;
  return this.getClientToken().then(function (response) {
    var options = opt_options || {};

    var params = {};

    //   var body = {
    //     "description": "This is a test queue",
    //     "deserved": {
    //       "cpu": 10,
    //       "memory": 20
    //     },
    //     "name": "demo",
    //     "parentQueue": "root",
    //     "queueType": "Regular",
    //     "disableOversell": false
    //   };

    debug('createInstance, params = %j, body = %j', params, body);

    return me.sendRequest('POST', `/api/v1/resourcepools/${resourcePoolId}/queue`, {
      config: options.config,
      params: params,
      body: JSON.stringify(body)
    });
  });
};

// PUT 队列更新
AihcClient.prototype.updateResourcepoolQueue = function (resourcePoolId, queueName, body, opt_options) {
  var options = opt_options || {};
  var params = {};

  // body = {
  //     "description": "This is a test",
  //     "disableOversell": true,
  //     "deserved": {
  //       "cpu": 5,
  //       "memory": 10
  //     }
  //   }

  return this.sendRequest('PUT', `/api/v1/resourcepools/${resourcePoolId}/queue/${queueName}`, {
    params,
    config: options.config,
    body: JSON.stringify(body)
  });
};

// POST 创建训练任务
AihcClient.prototype.createAIJob = function (resourcePoolId, body, opt_options) {
  var me = this;
  var options = opt_options || {};

  var params = {
    resourcePoolId: resourcePoolId
  };

  debug('createInstance, params = %j, body = %j', params, body);

  return me.sendRequest('POST', '/api/v1/aijobs', {
    config: options.config,
    params: params,
    body: JSON.stringify(body)
  });
};

// GET 查询训练任务列表
AihcClient.prototype.listAIJobs = function (resourcePoolId, opt_options) {
    var options = opt_options || {};
    var params = {
        resourcePoolId: resourcePoolId,
    };
    const config = options.config;
    console.log('listAIJobs, params = %j', params);
    console.log('listAIJobs, config = %j', config);
    return this.sendRequest('GET', '/api/v1/aijobs', {
      params,
      config
    });
  };

// GET 查询训练任务详情
AihcClient.prototype.getAIJob = function (resourcePoolId, jobId, opt_options) {
    var options = opt_options || {};
    var params = {
        resourcePoolId: resourcePoolId,
    };
    const config = options.config;
    console.log('listAIJobs, params = %j', params);
    console.log('listAIJobs, config = %j', config);
    return this.sendRequest('GET', `/api/v1/aijobs/${jobId}`, {
      params,
      config
    });
  };

// 删除训练任务
// 更新训练任务
// 查询训练任务事件
// 查询训练任务日志
// 查询训练任务Pod事件
// 停止训练任务
// 查询训练任务监控
// 查询训练任务所在节点列表
// GET 获取训练任务WebTerminal地址
AihcClient.prototype.getAIJobWebterminal = function (resourcePoolId, jobId, podName, opt_options) {
  var options = opt_options || {};
  var params = {
      resourcePoolId: resourcePoolId,
  };
  const config = options.config;
  console.log('listAIJobs, params = %j', params);
  console.log('listAIJobs, config = %j', config);
  return this.sendRequest('GET', `/api/v1/aijobs/${jobId}/pods/${podName}/webterminal`, {
    params,
    config
  });
};

// GET /instance/price
AihcClient.prototype.getPackages = function (opt_options) {
  var options = opt_options || {};

  return this.sendRequest('GET', '/v1/instance/price', {
    config: options.config
  });
};

// GET /image?marker={marker}&maxKeys={maxKeys}&imageType={imageType}
AihcClient.prototype.getImages = function (opt_options) {
  var options = opt_options || {};

  // imageType => All, System, Custom, Integration
  var params = u.extend({maxKeys: 1000, imageType: 'All'}, u.pick(options, 'maxKeys', 'marker', 'imageType'));

  return this.sendRequest('GET', '/v1/image', {
    config: options.config,
    params: params
  });
};

// POST /instance
AihcClient.prototype.createInstance = function (body, opt_options) {
  var me = this;
  return this.getClientToken().then(function (response) {
    var options = opt_options || {};

    var clientToken = response.body.token;
    var params = {
      clientToken: clientToken
    };

    /**
        var body = {
            // MICRO,SMALL,MEDIUM,LARGE,XLARGE,XXLARGE
            instanceType: string,
            imageId: string,
            ?localDiskSizeInGB: int,
            ?createCdsList: List<CreateCdsModel>,
            ?networkCapacityInMbps: int,
            ?purchaseCount: int,
            ?name: string,
            ?adminPass: string,
            ?networkType: string,
            ?noahNode: string
        };
        */

    debug('createInstance, params = %j, body = %j', params, body);

    return me.sendRequest('POST', '/v1/instance', {
      config: options.config,
      params: params,
      body: JSON.stringify(body)
    });
  });
};

// PUT /instance/{instanceId}?action=start
AihcClient.prototype.startInstance = function (id, opt_options) {
  var options = opt_options || {};
  var params = {
    start: ''
  };

  return this.sendRequest('PUT', '/v1/instance/' + id, {
    params: params,
    config: options.config
  });
};

// PUT /instance/{instanceId}?action=stop
AihcClient.prototype.stopInstance = function (id, opt_options) {
  var options = opt_options || {};
  var params = {
    stop: ''
  };

  return this.sendRequest('PUT', '/v1/instance/' + id, {
    params: params,
    config: options.config
  });
};

// PUT /instance/{instanceId}?action=reboot
AihcClient.prototype.restartInstance = function (id, opt_options) {
  var options = opt_options || {};
  var params = {
    reboot: ''
  };

  return this.sendRequest('PUT', '/v1/instance/' + id, {
    params: params,
    config: options.config
  });
};

// PUT /instance/{instanceId}?action=changePass
AihcClient.prototype.changeInstanceAdminPassword = abstractMethod;

// PUT /instance/{instanceId}?action=rebuild
AihcClient.prototype.rebuildInstance = abstractMethod;

// PUT /instance/{instanceId}/securityGroup/{securityGroupId}?action=bind
AihcClient.prototype.joinSecurityGroup = abstractMethod;

// PUT /instance/{instanceId}/securityGroup/{securityGroupId}?action=unbind
AihcClient.prototype.leaveSecurityGroup = abstractMethod;

// GET /instance/{instanceId}/vnc
AihcClient.prototype.getVNCUrl = function (id, opt_options) {
  var options = opt_options || {};

  return this.sendRequest('GET', '/v1/instance/' + id + '/vnc', {
    config: options.config
  });
};

AihcClient.prototype.getClientToken = function (opt_options) {
  return this.sendRequest('POST', '/v1/token/create');
};

// --- E N D ---

AihcClient.prototype._generateClientToken = function () {
  var clientToken = Date.now().toString(16) + (Number.MAX_VALUE * Math.random()).toString(16).substr(0, 8);
  return 'ClientToken:' + clientToken;
};

module.exports = AihcClient;

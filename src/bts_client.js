/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */

var util = require('util');

var models = require('./bts/models');
var BceBaseClient = require('./bce_base_client');

var CreateInstanceRequest = models.CreateInstanceRequest;
var CreateTableRequest = models.CreateTableRequest;
var UpdateTableRequest = models.UpdateTableRequest;
var PutRowRequest = models.PutRowRequest;
var BatchPutRowRequest = models.BatchPutRowRequest;
var DeleteRowRequest = models.DeleteRowRequest;
var BatchDeleteRowRequest = models.BatchDeleteRowRequest;
var GetRowRequest = models.GetRowRequest;
var BatchGetRowRequest = models.BatchGetRowRequest;
var ScanRequest = models.ScanRequest;

/**
 * Bts service api
 *
 *
 * @see https://cloud.baidu.com/doc/BTS/s/Ljwvydqd9
 *
 * @constructor
 * @param {Object} config The bts client configuration.
 * @extends {BceBaseClient}
 */

function BtsClient(config) {
    BceBaseClient.call(this, config, 'bts', true);
}
util.inherits(BtsClient, BceBaseClient);

/**
 * 列举实例 ListInstances
 * @returns {*}
 */
BtsClient.prototype.listInstances = function () {
    return this.sendRequest('GET', '/v1/instances', null);
};

/**
 * 删除实例 DropInstance
 * @param instanceName 实例名
 * @returns {*}
 */
BtsClient.prototype.dropInstance = function (instanceName) {
    return this.sendRequest('DELETE', '/v1/instance/' + instanceName, null);
};

/**
 * 显示实例信息 ShowInstance
 * @param instanceName 实例名
 * @returns {*}
 */
BtsClient.prototype.showInstance = function (instanceName) {
    return this.sendRequest('GET', '/v1/instance/' + instanceName, null);
};

/**
 * 创建实例 CreateInstance
 * @param instanceName 实例名
 * @param createInstanceRequest CreateInstance请求体
 * @returns {*}
 */
BtsClient.prototype.createInstance = function (instanceName, createInstanceRequest) {
    return this.sendRequest('PUT', '/v1/instance/' + instanceName, {
        body: JSON.stringify(createInstanceRequest)
    });
};

/**
 * 创建表 CreateTable
 * @param instanceName 实例名
 * @param tableName 表名
 * @param createTableRequest CreateTable请求体
 * @returns {*}
 */
BtsClient.prototype.createTable = function (instanceName, tableName, createTableRequest) {
    return this.sendRequest('PUT', '/v1/instance/' + instanceName + '/table/' + tableName, {
        body: JSON.stringify(createTableRequest)
    });
};

/**
 * 更新表 UpdateTable
 * @param instanceName 实例名
 * @param tableName 表名
 * @param UpdateTableRequest UpdateTable请求体
 * @returns {*}
 */
BtsClient.prototype.updateTable = function (instanceName, tableName, updateTableRequest) {
    return this.sendRequest('PUT', '/v1/instance/' + instanceName + '/table/' + tableName, {
        body: JSON.stringify(updateTableRequest)
    });
};

/**
 * 删除表 DropTable
 * @param instanceName 实例名
 * @param tableName 表名
 * @returns {*}
 */
BtsClient.prototype.dropTable = function (instanceName, tableName) {
    return this.sendRequest('DELETE', '/v1/instance/' + instanceName + '/table/' + tableName, null);
};

/**
 * 显示表信息 ShowTable
 * @param instanceName 实例名
 * @param tableName 表名
 * @param onlyState 设为true则响应只会返回tableState字段，主要用于建表成功后轮询状态使用
 * @returns {*}
 */
BtsClient.prototype.showTable = function (instanceName, tableName, onlyState) {
    var params = {
        onlyState: ''
    };
    if (onlyState) {
        return this.sendRequest('GET', '/v1/instance/' + instanceName + '/table/' + tableName, {
            params: params
        });
    } else {
        return this.sendRequest('GET', '/v1/instance/' + instanceName + '/table/' + tableName, null);
    }
};

/**
 * 列举所有表 ListTables
 * @param instanceName 实例名
 * @returns {*}
 */
BtsClient.prototype.listTables = function (instanceName) {
    return this.sendRequest('GET', '/v1/instance/' + instanceName + '/tables', null);
};

/**
 * 单条写入 PutRow
 * @param instanceName 实例名
 * @param tableName 表名
 * @param putRowRequest PutRow请求体
 * @returns {*}
 */
BtsClient.prototype.putRow = function (instanceName, tableName, putRowRequest) {
    putRowRequest.rowkey = putRowRequest.encode(putRowRequest.rowkey);
    return this.sendRequest('PUT', '/v1/instance/' + instanceName + '/table/' + tableName + '/row', {
        body: JSON.stringify(putRowRequest)
    });
};

/**
 * 批量写入 BatchPutRow
 * @param instanceName 实例名
 * @param tableName 表名
 * @param batchPutRowRequest batchPutRow 请求体
 * @returns {*}
 */
BtsClient.prototype.batchPutRow = function (instanceName, tableName, batchPutRowRequest) {
    return this.sendRequest('PUT', '/v1/instance/' + instanceName + '/table/' + tableName + '/rows', {
        body: JSON.stringify(batchPutRowRequest)
    });
};

/**
 * 单条删除 DeleteRow
 * @param instanceName 实例名
 * @param tableName 表名
 * @param deleteRowRequest deleteRow 请求体
 * @returns {*}
 */
BtsClient.prototype.deleteRow = function (instanceName, tableName, deleteRowRequest) {
    deleteRowRequest.rowkey = deleteRowRequest.encode(deleteRowRequest.rowkey);
    return this.sendRequest('DELETE', '/v1/instance/' + instanceName + '/table/' + tableName + '/row', {
        body: JSON.stringify(deleteRowRequest)
    });
};

/**
 * 批量删除 BatchDeleteRow
 * @param instanceName 实例名
 * @param tableName 表名
 * @param batchDeleteRowRequest BatchDeleteRow 请求体
 * @returns {*}
 */
BtsClient.prototype.batchDeleteRow = function (instanceName, tableName, batchDeleteRowRequest) {
    return this.sendRequest('DELETE', '/v1/instance/' + instanceName + '/table/' + tableName + '/rows', {
        body: JSON.stringify(batchDeleteRowRequest)
    });
};

/**
 * 单条随机读 GetRow
 * @param instanceName 实例名
 * @param tableName 表名
 * @param getRowRequest GetRow 请求体
 * @returns {*}
 */
BtsClient.prototype.getRow = function (instanceName, tableName, getRowRequest) {
    getRowRequest.rowkey = getRowRequest.encode(getRowRequest.rowkey);
    return this.sendRequest('GET', '/v1/instance/' + instanceName + '/table/' + tableName + '/row', {
        body: JSON.stringify(getRowRequest)
    });
};

/**
 * 批量读 BatchGetRow
 * @param instanceName 实例名
 * @param tableName 表名
 * @param batchGetRowRequest BatchGetRow 请求体
 * @returns {*}
 */
BtsClient.prototype.batchGetRow = function (instanceName, tableName, batchGetRowRequest) {
    return this.sendRequest('GET', '/v1/instance/' + instanceName + '/table/' + tableName + '/rows', {
        body: JSON.stringify(batchGetRowRequest)
    });
};

/**
 * 区间读 Scan
 * @param instanceName 实例名
 * @param tableName 表名
 * @param scanRowRequest Scan 请求体
 * @returns {*}
 */
BtsClient.prototype.scan = function (instanceName, tableName, scanRowRequest) {
    if (scanRowRequest.startRowkey !== null) {
        scanRowRequest.startRowkey = scanRowRequest.encode(scanRowRequest.startRowkey);
    }

    if (scanRowRequest.stopRowkey !== null) {
        scanRowRequest.stopRowkey = scanRowRequest.encode(scanRowRequest.stopRowkey);
    }
    return this.sendRequest('GET', '/v1/instance/' + instanceName + '/table/' + tableName + '/rows', {
        body: JSON.stringify(scanRowRequest)
    });
};

module.exports = {
    BtsClient: BtsClient,
    CreateInstanceRequest: CreateInstanceRequest,
    CreateTableRequest: CreateTableRequest,
    UpdateTableRequest: UpdateTableRequest,
    PutRowRequest: PutRowRequest,
    BatchPutRowRequest: BatchPutRowRequest,
    DeleteRowRequest: DeleteRowRequest,
    BatchDeleteRowRequest: BatchDeleteRowRequest,
    GetRowRequest: GetRowRequest,
    BatchGetRowRequest: BatchGetRowRequest,
    ScanRequest: ScanRequest,
};
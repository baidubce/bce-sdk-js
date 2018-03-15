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
 * @file test/sdk/cfc_client.spec.js
 * @author marspanda
 */

var config = require('../config');
var CfcClient = require('../..').CfcClient;
var debug = require('debug')('bce-sdk:CfcClient');

describe('CfcClient', function () {
    var client;
    var options = {};
    options.marker = 10;
    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000;

        client = new CfcClient(config.cfc);
    });
    var body = {
        Code: {
            ZipFile: 'UEsDBBQACAAIAAAAAAAAAAAAAAAAAAAAAAAIAAAAaW5kZXguanNKrSjILyop1stIzEvJSS1SsFXQSC1LzSvRUUjO'
                     + 'zytJrQAxEnNykhKTszUVbO0UqrkUFBTgQhp5pTk5OgpgHdFKiUqxmtZctdaAAAAA//9QSwcI9fw51k4AAABUAAAA'
                     + 'UEsBAhQAFAAIAAgAAAAAAPX8OdZOAAAAVAAAAAgAAAAAAAAAAAAAAAAAAAAAAGluZGV4LmpzUEsFBgAAAAABAAEAN'
                     + 'gAAAIQAAAAAAA==',
            Publish: false,
            DryRun: true
        },
        Description: 'bce_sdk_test_' + Date.now(),
        Region: 'bj',
        Timeout: 3,
        FunctionName: 'bce_sdk_test_' + Date.now(),
        Handler: 'index.handler',
        Runtime: 'nodejs6.11',
        MemorySize: 128,
        Environment: {
            Variables: {
                a: 'b'
            }
        }
    };
    var aliasBody = {
        FunctionVersion: '1',
        Name: 'I_am_alias',
        Description: 'I_am_alias'
    };
    var invokeBody = {
        a: 'hello'
    };
    var invokeOptions = {
        logToBody: 'false',
        invocationType: 'RequestResponse',
        logType: 'Tail',
        Qualifier: '$LATEST'
    };
    var brn;
    debug('name ', 'bce_sdk_test' + Date.now());
    it('createFunction', function () {
        return client.createFunction(body)
            .then(function (response) {
                debug('createFunction response (%j)', response.body);
                brn = response.body.FunctionBrn;
                return client.getFunction(response.body.FunctionName);
            }).then(function (response) {
                debug('createFunction response (%j)', response.body);
                return client.invocations(body.FunctionName, invokeBody, invokeOptions);
            }).then(function (response) {
                debug('invocations response (%s)', response.body);
                invokeOptions.logToBody = 'false';
                invokeOptions.logType = 'None';
                return client.invocations(body.FunctionName, invokeBody, invokeOptions);
            }).then(function (response) {
                debug('invocations response (%s)', response.body);
                body.Code.Publish = true;
                return client.updateFunctionCode(body.FunctionName, body.Code);
            }).then(function (response) {
                debug('updateFunctionCode response (%j)', response.body);
                var option = {
                    Qualifier: '1'
                };
                return client.getFunctionConfiguration(response.body.FunctionName, option);
            }).then(function (response) {
                debug('GetFunctionConfiguration response (%j)', response.body);
                body.Timeout = 10;
                return client.updateFunctionConfiguration(response.body.FunctionName, body);
            }).then(function (response) {
                debug('updateFunctionConfiguration response (%j)', response.body);
                return client.listVersionsByFunction(response.body.FunctionName, {Marker: 0, MaxItems: 10});
            }).then(function (response) {
                debug('listVersionsByFunction response (%j)', response.body);
                return client.publishVersion(brn, 'publish version');
            }).then(function (response) {
                debug('publishVersion response (%j)', response.body);
                return client.invocations(brn, invokeBody, invokeOptions);
            }).then(function (response) {
                debug('invocations FunctionBrn (%s)', response.body);
                return client.createAlias(body.FunctionName, aliasBody);
            }).then(function (response) {
                debug('createAlias response (%j)', response);
                return client.getAlias(body.FunctionName, response.body.Name);
            }).then(function (response) {
                debug('getAlias response (%j)', response);
                aliasBody.Description = 'change desc';
                return client.updateAlias(response.body.FunctionName, response.body.Name, aliasBody);
            }).then(function (response) {
                debug('updateAlias response (%j)', response);
                return client.listAliases(response.body.FunctionName);
            }).then(function (response) {
                debug('listAliases response (%j)', response);
                return client.deleteAlias(body.FunctionName, aliasBody.Name);
            }).then(function (response) {
                debug('deleteAlias response (%j)', response);
                return client.deleteFunction(body.FunctionName);
            }).catch(function (reason) {
                debug('error', reason);
            });
    });

});

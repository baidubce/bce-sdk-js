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
 * @file test/sdk/tsdb_data_client.spec.js
 * @author lidandan
 */

var util = require('util');
var UUID = require('uuid');
var Q = require('q');

var expect = require('expect.js');
var debug = require('debug')('tsdb_data_client.spec');
var config = require('../config');
var helper = require('./helper');
var TsdbDataClient = require('../../src/tsdb_data_client');

var TsdbAdminClient = require('../../src/tsdb_admin_client');
// var TsdbAdminClient = require('../../').TsdbAdminClient;

describe('TsdbDataClient', function () {
    var clientData;
    var databaseName;
    var metricName;
    var datapoints;
    var queryList;
    var sql;
    var options;

    this.timeout(10 * 60 * 1000);

    function delay(ms) {
        var deferred = Q.defer();
        setTimeout(deferred.resolve, ms);
        return deferred.promise;
    }

    beforeEach(function () {
        fail = helper.fail(this);
        var id = Math.floor(Math.random() * 100000) + 900;
        databaseName = util.format('testdata%d', id);
        clientToken = UUID.v4();
        ingestDataPointsMonthly = 1;
        purchaseLength = 1;
        description = 'This is a test for TSDB.';
        options = {
            headers: {'User-Agent': 'TSDB-node-test'}
        };
        metricName='cpu_idle';
        datapoints = [{
                "metric": "cpu_idle",
                "field": "value",
                "tags": {
                    "host": "server1",
                    "rack": "rack1"
                },
                "timestamp": Math.round(new Date().getTime() / 1000),
                "value": 51
            }, {
                "metric": "cpu_idle",
                "field": "value",
                "tags": {
                    "host": "server2",
                    "rack": "rack2"
                },
                "values": [
                    [Math.round(new Date().getTime() / 1000), 67],
                    [Math.round(new Date().getTime() / 1000), 60]
                ]
            }];

        queryList = [{
                "metric": "cpu_idle",
                "field": "value",
                "filters": {
                    "start": "1 hour ago",
                    "tags": {
                        "host": ["server1", "server2"]
                    },
                    "value": ">= 10"
                },
                "groupBy": [
                    {
                        "name": "Tag",
                        "tags": ["host"]
                    }
                ],
                "limit": 1000,
                "aggregators": [{
                    "name": "Sum",
                    "sampling": "10 minutes"
                }]
            }];
        sql = 'select * from cpu_idle';
        clientData = new TsdbDataClient(config.tsdbData);
    });

    afterEach(function () {
        // nothing
    });

    it('ok', function () {});

    it('writeDatapoints', function () {
        expect(datapoints).not.to.be(undefined);
        return clientData.writeDatapoints(datapoints, true, options)
        .then(function (response) {

        });
    });
    it('writeDatapointsWithoutGzip', function () {
        expect(datapoints).not.to.be(undefined);
        return clientData.writeDatapoints(datapoints, false, options)
        .then(function (response) {

        });
    });
    it('getMetrics', function() {
        return clientData.getMetrics(options)
        .then(function (response) {
            debug('%j', response);
            var metrics = response.body.metrics;
            expect(metrics).not.to.be(undefined);
            expect(metrics[0]).to.eql('cpu_idle');
            var metricName = metrics[0];
            console.log(metricName);
        });
    });
    it('getTags', function() {
        return clientData.getTags(metricName, options)
        .then(function (response) {
            debug('%j', response);
            var tags = response.body.tags;
            expect(tags).not.to.be(undefined);
            expect(tags).to.eql({
                rack: ["rack1", "rack2"],
                host: ["server1", "server2"]
            });
        });
    });
    it('getFields', function() {
        return clientData.getFields(metricName, options)
        .then(function (response) {
            debug('%j', response);
            var fields = response.body.fields;
            expect(fields).to.eql({value: {type: 'Number'}});
        });
    });
    it('getDatapoints', function() {
        return clientData.getDatapoints(queryList, options)
        .then(function (response) {
            debug('%j', response);
            expect(response.body.results[0].metric).to.be.eql('cpu_idle');
            expect(response.body.results[0].field).to.be.eql('value');
            // expect(response.body.results[0].rawCount).to.be.eql('2');
        });
    });
    it('generatePresignedUrl', function() {
        var url = clientData.generatePresignedUrl(queryList, 0, 1800, null, {});
        debug('url = %s', url);
        // 浏览器输入url可查看datapoint
        console.log(url);
        return helper.get(url)
        .then(function (body) {
            // body.toString()的结果与getDatapoints的返回结果一致
            // console.log(body.toString());
        });
    });
    it('getRowsWithSql', function() {
        return clientData.getRowsWithSql(sql, options)
        .then(function (response) {
            // console.log(response.body);
            // expect(response.body.rows.length).to.be.eql(4);
        });
    });
    it('generatePresignedUrlWithSql', function () {
        var url =  clientData.generatePresignedUrlWithSql(sql, 0, 1800, null, {});
        return helper.get(url)
        .then(function (body) {
            // console.log(body.toString());
        });
    });
});

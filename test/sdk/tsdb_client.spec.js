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
 * @file test/sdk/tsdb_client.spec.js
 * @author dan
 */

var Q = require('q');

var expect = require('expect.js');
var debug = require('debug')('tsdb_client.spec');
var config = require('../config');
var helper = require('./helper');
var TsdbClient = require('../../src/tsdb_client');

describe('TsdbClient', function () {
    var client;
    var fail;
    this.timeout(10 * 60 * 1000);

    beforeEach(function () {
        fail = helper.fail(this);
        client = new TsdbClient(config.tsdb);
    });

    afterEach(function () {
        // nothing
    });

    function delay(ms) {
        var deferred = Q.defer();
        setTimeout(deferred.resolve, ms);
        return deferred.promise;
    }

    it('ok', function () {});

    it('getMetrics', function () {
        const database = 'testgetmetriclists2';
        return client.getMetrics(database)
            .then(function (response) {
                debug('%j', response);
                var metrics = response.body.metrics;
                expect(metrics).not.to.be(undefined);
                console.log(metrics[0]);
                expect(metrics[0]).to.eql('cpu_idle');
                expect(metrics[1]).to.eql('humidity');
                expect(metrics[2]).to.eql('pm25');
                expect(metrics[3]).to.eql('precipitation');
                expect(metrics[4]).to.eql('temperature');
                expect(metrics[5]).to.eql('wind');
            }).catch(function (error) {
                if (error.code === 'AccessDenied') {
                    expect(error.status_code).to.eql(403);
                    expect(error.message).to.eql('Database does not exist');
                    expect(error.code).to.eql('AccessDenied');
                }
                else {
                    fail(error);
                }
            });
    });

    it('getTags', function () {
        const database = 'testgetmetriclists2';
        const metricName = 'humidity';
        return client.getTags(database, metricName)
            .then(function (response) {
                debug('%j', response);
                var tags = response.body.tags;
                expect(tags).not.to.be(undefined);
                console.log(tags[0]);
                expect(tags.city[0]).to.eql('上海');
                expect(tags.city[1]).to.eql('北京');
                expect(tags.city[2]).to.eql('广州');
            }).catch(function (error) {
                if (error.code === 'AccessDenied') {
                    expect(error.status_code).to.eql(403);
                    expect(error.message).to.eql('Database does not exist');
                    expect(error.code).to.eql('AccessDenied');
                }
                else {
                    fail(error);
                }
            });
    });

    it('getFields', function () {
        const database = 'testgetmetriclists2';
        const metricName = 'humidity';
        return client.getFields(database, metricName)
            .then(function (response) {
                var fields = response.body.fields;
                expect(fields).not.to.be(undefined);
                console.log(fields);
                expect(fields).to.eql({value: {type: 'Number'}});
            }).catch(function (error) {
                if (error.code === 'AccessDenied') {
                    expect(error.status_code).to.eql(403);
                    expect(error.message).to.eql('Database does not exist');
                    expect(error.code).to.eql('AccessDenied');
                }
                else {
                    fail(error);
                }
            });
    });

    it('getDatapoints', function () {
        const database = 'testgetmetriclists2';
        var queryList = [
            {
                "metric": "humidity",
                "field": "value",
                "filters": {
                    "start": "1 hour ago",
                    "tags": {
                        "city": ["上海", "北京"]
                    },
                    "value": ">= 10"
                },
                "groupBy": [
                    {
                        "name": "Tag",
                        "tags": ["上海"]
                    }
                ],
                "limit": 1000,
                "aggregators": [{
                    "name": "Sum",
                    "sampling": "10 minutes"
                }]
            }
        ];
        return client.getDatapoints(database, queryList)
            .then(function (response) {
                expect(response.body).to.eql({
                    "results": [
                        {
                            "metric": 'humidity',
                            "field": 'value',
                            "groups": [],
                            "rawCount": 0
                        }
                    ]
                });
            }).catch(function (error) {
                if (!queries[0].filters.start) {
                    expect(error.status_code).to.eql(400);
                    expect(error.message).to.eql('queries[0].filters.start should not be null');
                    expect(error.code).to.eql('InvalidArgument');
                }
                else {
                    fail(error);
                }
            });
    });

    it('writeDatapoints', function () {
        const database = 'testgetmetriclists2';
        var datapoints = [{
                "metric": "cpu_idle",
                "tags": {
                    "host": "server1",
                    "rack": "rack1"
                },
                "timestamp": 1465376157007,
                "value": 51
            }, {
                "metric": "cpu_idle",
                "tags": {
                    "host": "server2",
                    "rack": "rack2"
                },
                "values": [
                    [1465376269769, 67],
                    [1465376325057, 60]
                ]
            }];
        return client.writeDatapoints(database, datapoints)
            .then(function (response) {
                return client.getMetrics(database);
            })
            .then(function (response) {
                var metrics = response.body.metrics;
                expect(metrics).not.to.be(undefined);
                expect(metrics[0]).to.eql("cpu_idle");
            })
            .then(function () {
                const metricName = "cpu_idle";
                return client.getTags(database, metricName);
            })
            .then(function (response) {
                debug('%j', response);
                var tags = response.body.tags;
                expect(tags).not.to.be(undefined);
                expect(tags).to.eql({
                    "rack": [ 
                        'rack1',
                        'rack2'
                    ],
                    "host": [
                        'server1',
                        'server2'
                    ]
                });
            })
            .then(function () {
                const metricName = "cpu_idle";
                return client.getFields(database, metricName);
            })
            .then(function (response) {
                var fields = response.body.fields;
                expect(fields).not.to.be(undefined);
                console.log(fields);
                expect(fields).to.eql({value: {type: 'Number'}});
            });
    });
});

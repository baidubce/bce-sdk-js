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
 * @file test/sdk/tsdb_admin_client.spec.js
 * @author lidandan
 */

var util = require('util');
var UUID = require('uuid');

var expect = require('expect.js');
var debug = require('debug')('tsdb_admin_client.spec');
var config = require('../config');
var helper = require('./helper');
var TsdbAdminClient = require('../../src/tsdb_admin_client');

describe('TsdbAdminClient', function () {
    var clientAdmin;
    var fail;
    var databaseName;
    var length;
    var clientToken;
    var purchaseLength;
    var description;
    var datapoints;
    var ingestDataPointsMonthly;
    this.timeout(10 * 60 * 1000);

    beforeEach(function () {
        fail = helper.fail(this);
        var id = Math.floor(Math.random() * 100000) + 900;
        databaseName = util.format('testdata%d', id);
        clientToken = UUID.v4();
        clientAdmin = new TsdbAdminClient(config.tsdbAdmin);
    });

    afterEach(function () {
        // nothing
    });

    it('ok', function () {});

    it('createDatabase', function () { 
        ingestDataPointsMonthly = 1;
        purchaseLength = 1;
        description = 'This is a test for TSDB.';

        return clientAdmin.createDatabase(clientToken, databaseName,
                ingestDataPointsMonthly, purchaseLength, description, '', 1)
        .then(function (response) {
            debug('%j', response);
            expect(response.body.databaseId).not.to.be(undefined);
            expect(response.body.charge).not.to.be(undefined);
            expect(response.body.expiredTime).not.to.be(undefined);
            expect(response.body.orderId).not.to.be(undefined);
        });
    });

    it('listDatabase & getDatabaseInfo', function () {
        return clientAdmin.listDatabase()
        .then(function (response) {
            debug('%j', response);
            var databaseId = response.body.databases[0].databaseId;
            return clientAdmin.getDatabaseInfo(databaseId);
        })
        .then(function (response) {
            debug('%j', response);
            expect(response.body.databaseId).not.to.be(undefined);
            expect(response.body.databaseName).not.to.be(undefined);
            expect(response.body.description).not.to.be(undefined);
            expect(response.body.endpoint).not.to.be(undefined);
            expect(response.body.quota.ingestDataPointsMonthly).not.to.be(undefined);
            expect(response.body.quota.storeBytesQuota).not.to.be(undefined);
            expect(response.body.status).not.to.be(undefined);
            expect(response.body.autoExport).not.to.be(undefined);
            expect(response.body.createTime).not.to.be(undefined);
            expect(response.body.expiredTime).not.to.be(undefined);
        });
    });

    it('deleteDatabase', function () {
        databaseId='dddddd';
        return clientAdmin.deleteDatabase(databaseId)
        .catch(function (error) {
            if (error.code === 'DeleteUnexpiredDatabaseFailed') {
                expect(error.status_code).to.eql(400);
                expect(error.message).to.eql('Can not delete unexpired database');
            } else if (error.code === 'ResourceNotFound') {
                expect(error.status_code).to.eql(400);
                expect(error.message).to.eql('Database not found');
            } else {
                fail(error);
            }
        });
    });
});

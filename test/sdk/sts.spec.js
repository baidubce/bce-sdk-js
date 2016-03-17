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
 * @file sdk/sts.spec.js
 * @author zhouhua
 */

var path = require('path');
var fs = require('fs');

var Q = require('q');
var u = require('underscore');
var debug = require('debug')('sts.spec');

var config = require('../config');
var STS = require('../../').STS;
var BosClient = require('../../').BosClient;
var helper = require('./helper');

describe('STS', function () {
    var fail;
    var tempAk;
    var tempSk;
    var sessionToken;
    var bucket = 'javascript-sdk-testcase';
    var key = 'object' + (+new Date());
    var stsClient = new STS(config.sts);
    var bosClient = new BosClient(config.bos);
    var defaultText = 'hello world';

    function clearBucket(bucketName) {
        var promise =
            bosClient.listObjects(bucketName)
                .then(function (response) {
                    var defers = [];
                    u.each(response.body.contents, function (object) {
                        defers.push(bosClient.deleteObject(bucketName, object.key))
                    });
                    return Q.all(defers);
                });
        return promise;
    }

    beforeEach(function (done) {
        fail = helper.fail(this);
        bosClient.doesBucketExist(bucket)
            .then(function () {
                return clearBucket(bucket);
            }, function () {
                return bosClient.createBucket(bucket);
            })
            .then(function () {
                return bosClient.putObjectFromString(bucket, key, defaultText);
            })
            .fin(done);
    });

    afterEach(function (done) {
        clearBucket(bucket).fin(done);
    });

    it('Read From BOS', function (done) {
        stsClient.getSessionToken(6000, {
                accessControlList: [{
                    service: 'bce:bos',
                    resource: [bucket+'/*'],
                    region: '*',
                    effect: 'Allow',
                    permission: ['READ']
                }]
            })
            .then(function (response) {
                tempAk = response.body.accessKeyId;
                tempSk = response.body.secretAccessKey;
                sessionToken = response.body.sessionToken;
                console.log(tempAk);
                console.log(tempSk);
                console.log(sessionToken);
                var tempBosClient = new BosClient(u.extend({}, config.bos, {
                    credentials: {
                        ak: tempAk,
                        sk: tempSk
                    },
                    sessionToken: sessionToken
                }));
                return tempBosClient.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(+response.http_headers['content-length']).toEqual(defaultText.length);
                expect(response.http_headers['content-md5']).toEqual(
                    require('../../src/crypto').md5sum(defaultText)
                );
            })
            .catch(fail)
            .fin(done);
    });
    it('Write To BOS', function (done) {
        var newText = 'Happy New Year';
        stsClient.getSessionToken(6000, {
                accessControlList: [{
                    service: 'bce:bos',
                    resource: [bucket+'/*'],
                    region: '*',
                    effect: 'Allow',
                    permission: ['READ', 'WRITE']
                }]
            })
            .then(function (response) {
                tempAk = response.body.accessKeyId;
                tempSk = response.body.secretAccessKey;
                sessionToken = response.body.sessionToken;
                var tempBosClient = new BosClient(u.extend({}, config.bos, {
                    credentials: {
                        ak: tempAk,
                        sk: tempSk
                    },
                    sessionToken: sessionToken
                }));
                return tempBosClient.putObjectFromString(bucket, key, newText)
                    .then(function () {
                        return tempBosClient.getObjectMetadata(bucket, key);
                    });
            })
            .then(function (response) {
                expect(+response.http_headers['content-length']).toEqual(newText.length);
                expect(response.http_headers['content-md5']).toEqual(
                    require('../../src/crypto').md5sum(newText)
                );
            })
            .catch(fail)
            .fin(done);
    });

});

/* vim: set ts=4 sw=4 sts=4 tw=120: */

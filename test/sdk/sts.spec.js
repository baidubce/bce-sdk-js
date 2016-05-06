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

import util from 'util';
import path from 'path';
import fs from 'fs';

import Q from 'q';
import u from 'underscore';
import expect from 'expect.js';
import _debug from 'debug';

import config from '../config';
import {STS, BosClient} from '../../';
import helper from './helper';
import crypto from '../../src/crypto';

let debug = _debug('sts.spec');

describe('STS', function () {
    var fail;

    var bucket;
    var key;

    var stsClient = new STS(config.sts);
    var bosClient = new BosClient(config.bos);
    var defaultText = 'hello world';

    this.timeout(10 * 60 * 1000);

    function clearBucket(bucketName) {
        return bosClient.listObjects(bucketName)
            .then(function (response) {
                var defers = [];
                u.each(response.body.contents, function (object) {
                    defers.push(bosClient.deleteObject(bucketName, object.key))
                });
                return Q.all(defers);
            });
    }

    beforeEach(function () {
        // jasmine.getEnv().defaultTimeoutInterval = 60 * 1000;

        fail = helper.fail(this);

        var id = Math.floor(Math.random() * 100000) + 900;
        bucket = util.format('test-bucket%d', id);
        key = util.format('test_object %d', id);

        return bosClient.createBucket(bucket)
            .then(function () {
                return bosClient.putObjectFromString(bucket, key, defaultText);
            });
    });

    afterEach(function () {
        return clearBucket(bucket);
    });

    it('Read From BOS', function () {
        return stsClient.getSessionToken(6000, {
                accessControlList: [{
                    service: 'bce:bos',
                    resource: [bucket + '/*'],
                    region: '*',
                    effect: 'Allow',
                    permission: ['READ']
                }]
            })
            .then(function (response) {
                var tempAk = response.body.accessKeyId;
                var tempSk = response.body.secretAccessKey;
                var sessionToken = response.body.sessionToken;
                debug(response.body);
                var client = new BosClient({
                    endpoint: config.bos.endpoint,
                    credentials: {
                        ak: tempAk,
                        sk: tempSk
                    },
                    sessionToken: sessionToken
                });
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(+response.http_headers['content-length']).to.eql(defaultText.length);
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum(defaultText));
            });
    });

    it('Write To BOS', function () {
        var newText = 'Happy New Year';
        var client;
        return stsClient.getSessionToken(6000, {
                accessControlList: [{
                    service: 'bce:bos',
                    resource: [bucket + '/*'],
                    region: '*',
                    effect: 'Allow',
                    permission: ['READ', 'WRITE']
                }]
            })
            .then(function (response) {
                var tempAk = response.body.accessKeyId;
                var tempSk = response.body.secretAccessKey;
                var sessionToken = response.body.sessionToken;
                client = new BosClient({
                    endpoint: config.bos.endpoint,
                    credentials: {
                        ak: tempAk,
                        sk: tempSk
                    },
                    sessionToken: sessionToken
                });
                return client.putObjectFromString(bucket, key, newText);
            })
            .then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(+response.http_headers['content-length']).to.eql(newText.length);
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum(newText));
            });
    });
});

/* vim: set ts=4 sw=4 sts=4 tw=120: */

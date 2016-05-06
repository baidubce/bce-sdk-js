/*
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
*/

import util from 'util';
import fs from 'fs';

import Q from 'q';
import u from 'underscore';
import expect from 'expect.js';
import _debug from 'debug';

import config from '../config';
import helper from './helper';
import {BosClient} from '../..'
import * as UploadHelper from '../../src/helper';
import crypto from '../../src/crypto';

let debug = _debug('upload_helper.spec');

describe('UploadHelper', function() {
    var client;
    var fail;

    var bucket;
    var key;
    var filename;

    this.timeout(10 * 60 * 1000);

    beforeEach(function() {
        // jasmine.getEnv().defaultTimeoutInterval = 60 * 1000;

        fail = helper.fail(this);

        var id = Math.floor(Math.random() * 100000) + 900;
        bucket = util.format('test-bucket%d', id);
        key = util.format('test_object %d', id);
        filename = util.format('temp_file%d', id);

        client = new BosClient(config.bos);

        return client.createBucket(bucket);
    });

    afterEach(function() {
        function deleteBucket(bucket_name) {
            var promise
                = client.listObjects(bucket_name)
                    .then(function(response) {
                        var defers = [];
                        u.each(response.body.contents, function(object) {
                            defers.push(client.deleteObject(bucket_name, object.key));
                        });
                        return Q.all(defers);
                    })
                    .then(function() {
                        return client.deleteBucket(bucket_name);
                    });
            return promise;
        }

        var res = client.listBuckets()
            .then(function(response) {
                var defers = [];
                (response.body.buckets || []).forEach(function(bucket) {
                    if (/^test\-bucket/.test(bucket.name)) {
                        defers.push(deleteBucket(bucket.name));
                    }
                });
                return Q.all(defers);
            });

        try {
            fs.unlinkSync(filename);
        }
        catch (ex) {
        }

        return res;
    });

    function prepareTemporaryFile(size) {
        var fd = fs.openSync(filename, 'w+');
        // 随机填充的数据
        var buffer = new Buffer(size);
        // buffer.fill(0);
        fs.writeSync(fd, buffer, 0, size, 0);
        fs.closeSync(fd);
    }

    it('upload direct from file', function () {
        return UploadHelper.upload(client, bucket, key, __filename)
            .then(function (response) {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(response.http_headers['content-length']).to.eql(
                    '' + fs.lstatSync(__filename).size);
                debug(response);
            });
    });

    it('upload multipart from file', function () {
        var filesize = 5 * 1024 * 1024 + 1;
        prepareTemporaryFile(filesize);

        return UploadHelper.upload(client, bucket, key, filename)
            .then(function (response) {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-type']).to.eql('application/octet-stream');
                expect(response.http_headers['content-length']).to.eql(
                    '' + fs.lstatSync(filename).size);
                debug(response);
            });
    });

    it('upload direct from stream', function () {
        var stream = fs.createReadStream(__filename);
        var options = {};
        options['Content-Length'] = fs.lstatSync(__filename).size;
        return UploadHelper.upload(client, bucket, key, stream, options)
            .then(function (response) {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-type']).to.eql('application/octet-stream');
                expect(response.http_headers['content-length']).to.eql(
                    '' + fs.lstatSync(__filename).size);
                debug(response);
            });
    });

    it('upload multipart from stream', function () {
        var filesize = 5 * 1024 * 1024 + 1;
        prepareTemporaryFile(filesize);

        var stream = fs.createReadStream(filename);
        var options = {};
        options['Content-Length'] = fs.lstatSync(filename).size;
        return UploadHelper.upload(client, bucket, key, stream, options)
            .then(function (response) {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                debug(response);
                expect(response.http_headers['content-type']).to.eql('application/octet-stream');
                expect(response.http_headers['content-length']).to.eql(
                    '' + fs.lstatSync(filename).size);
                return crypto.md5file(filename)
                    .then(function(md5sum) {
                        expect(response.http_headers['content-md5']).to.eql(md5sum);
                    });
            });
    });

    it('upload direct from buffer', function () {
        var buffer = fs.readFileSync(__filename);
        var options = {};
        options['Content-Type'] = 'application/javascript';
        return UploadHelper.upload(client, bucket, key, buffer, options)
            .then(function (response) {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(response.http_headers['content-length']).to.eql(
                    '' + fs.lstatSync(__filename).size);
                debug(response);
            });
    });

    it('upload multipart from buffer', function () {
        var filesize = 5 * 1024 * 1024 + 1;
        prepareTemporaryFile(filesize);

        var buffer = fs.readFileSync(filename);
        var options = {};
        options['Content-Type'] = 'application/javascript';
        return UploadHelper.upload(client, bucket, key, buffer, options)
            .then(function (response) {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                debug(response);
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(response.http_headers['content-length']).to.eql(
                    '' + fs.lstatSync(filename).size);
            });
    });
});










/* vim: set ts=4 sw=4 sts=4 tw=120: */

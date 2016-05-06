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
import path from 'path';
import fs from 'fs';

import Q from 'q';
import u from 'underscore';
import expect from 'expect.js';
import _debug from 'debug';

import config from '../config';
import helper from './helper';
import {BosClient} from '../..';
import crypto from '../../src/crypto';

let debug = _debug('bos_client.spec');

describe('BosClient', function () {
    var client;
    var fail;

    var bucket;
    var key;
    var filename;

    this.timeout(10 * 60 * 1000);

    beforeEach(function () {
        // jasmine.getEnv().defaultTimeoutInterval = 60 * 1000;

        fail = helper.fail(this);

        var id = Math.floor(Math.random() * 100000) + 900;
        bucket = util.format('test-bucket%d', id);
        key = util.format('test_object %d', id);
        filename = util.format('temp_file%d', id);

        client = new BosClient(config.bos);
    });

    afterEach(function () {
        function deleteBucket(bucket_name) {
            var promise =
                client.listObjects(bucket_name)
                    .then(function (response) {
                        var defers = [];
                        u.each(response.body.contents, function (object) {
                            defers.push(client.deleteObject(bucket_name, object.key))
                        });
                        return Q.all(defers);
                    })
                    .then(function () {
                        return client.deleteBucket(bucket_name);
                    });
            return promise;
        }

        return client.listBuckets()
            .then(function (response) {
                var defers = [];
                (response.body.buckets || []).forEach(function (bucket) {
                    if (/^test\-bucket/.test(bucket.name)) {
                        defers.push(deleteBucket(bucket.name));
                    }
                });
                return Q.all(defers);
            })
    });

    function prepareTemporaryFile(size) {
        var fd = fs.openSync(filename, 'w+');
        var buffer = new Buffer(size);
        buffer.fill(0);
        fs.writeSync(fd, buffer, 0, size, 0);
        fs.closeSync(fd);
    }

    it('getBucketLocation', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.getBucketLocation(bucket);
            })
            .then(function (response) {
                expect(response.body).to.eql({locationConstraint: 'bj'});
                return client.getBucketLocation(bucket, {
                    config: {
                        endpoint: 'https://gz.bcebos.com'
                    }
                });
            })
            .then(function (response) {
                expect(response.body).to.eql({locationConstraint: 'bj'});
            });
    });

    it('deleteMultipleObjects', function () {
        return client.createBucket(bucket)
            .then(function () {
                return Q.all([
                    client.putObjectFromFile(bucket, '1/' + key, __filename),
                    client.putObjectFromFile(bucket, '2/' + key, __filename),
                    client.putObjectFromFile(bucket, '3/' + key, __filename)
                ]);
            })
            .then(function () {
                return client.deleteMultipleObjects(bucket, [
                    '1/' + key,
                    '2/' + key,
                    '3/' + key,
                    '4/' + key
                ]);
            })
            .then(function (response) {
                expect(response.body).not.to.be(undefined);
                expect(response.body.errors).not.to.be(undefined);
                expect(response.body.errors[0].code).to.eql('NoSuchKey');
                expect(response.body.errors[0].key).to.eql('4/' + key);
            });
    });

    it('listBuckets', function () {
        return client.listBuckets()
            .then(function (response) {
                var buckets = u.filter(response.body.buckets, function (bucket) {
                    return /^test\-bucket/.test(bucket);
                });
                expect(buckets.length).to.eql(0);
                // expect(response.body.owner).to.eql(config.bos.account);
            });
    });

    it('doesBucketExist', function () {
        return client.doesBucketExist(bucket)
            .then(function (response) {
                expect(response).to.be(false);
            });
    });

    it('deleteBucket', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.doesBucketExist(bucket)
            })
            .then(function (response) {
                expect(response).to.be(true);
            })
            .then(function () {
                return client.deleteBucket(bucket);
            })
            .then(function () {
                return client.doesBucketExist(bucket)
            })
            .then(function (response) {
                expect(response).to.be(false);
            })

    });

    it('setBucketCannedAcl', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.setBucketCannedAcl(bucket, 'public-read-write');
            })
            .then(function (response) {
                return client.setBucketCannedAcl(bucket, 'public-read');
            })
            .then(function (response) {
                return client.setBucketCannedAcl(bucket, 'private');
            })
            .then(function (response) {
                return client.setBucketCannedAcl(bucket, 'invalid-acl');
            })
            .then(function (response) {
                return client.setBucketCannedAcl(bucket, 'private private ');
            })
            .catch(function (error) {
                if (error.code !== 'InvalidArgument') {
                    fail(error);
                }
            })

    });

    it('setBucketCannedAcl with invalid CannedAcl(tail spaces)', function () {
        return client.createBucket(bucket)
            .then(function (response) {
                return client.setBucketCannedAcl(bucket, 'private private  ')
                    .then(function () {
                        fail('should not reach here');
                    }, function (error) {
                        if (error.code !== 'InvalidArgument') {
                            fail(error);
                        }
                    });
            });
    });

    it('setBucketAcl', function () {
        var grant_list = [
            {
                'grantee': [
                    {'id': '992c67ee10be4e85bf444d18b638f9ba'},
                    {'id': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'},
                ],
                'permission': ['FULL_CONTROL']
            },
            {
                'grantee': [
                    {'id': config.bos.account.id}
                ],
                'permission': ['FULL_CONTROL']
            }
        ];
        return client.createBucket(bucket)
            .then(function () {
                return client.setBucketAcl(bucket, grant_list);
            })
            .then(function () {
                return client.getBucketAcl(bucket)
            })
            .then(function (response) {
                expect(response.body.accessControlList[0]).to.eql(grant_list[0]);
                expect(response.body.accessControlList[1]).to.eql(grant_list[1]);
            })

    });

    it('putObjectWithInvalidSHA256', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromString(bucket, key, 'hello world', {
                        'x-bce-content-sha256': 'hahahaha'
                    })
                    .then(function () {
                        fail('should not reach here');
                    }, function (error) {
                        expect(error.status_code).to.eql(400);
                        expect(error.code).to.eql('BadDigest');
                    });
            });

    });

    it('putObjectFromDataUrl', function () {
        return client.createBucket(bucket)
            .then(function () {
                var dataUrl = new Buffer('hello world').toString('base64');
                return client.putObjectFromDataUrl(bucket, key, dataUrl);
            })
            .then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));
            })

    });

    it('putObjectFromString2', function () {
        var objectName = '/this/is/a/file.txt';
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromString(bucket, objectName, 'hello world');
            })
            .then(function () {
                return client.getObjectMetadata(bucket, objectName);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));

                return client.generatePresignedUrl(bucket, objectName, new Date(), 1800, {}, {'x-bce-range': '0-5'});
            })
            .then(function (url) {
                debug('url = %s', url);
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello ');
                return client.generatePresignedUrl(bucket, objectName);
            })
            .then(function (url) {
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello world');
            });
    });

    it('putObjectFromString', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromString(bucket, key, 'hello world');
            })
            .then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));

                return client.generatePresignedUrl(bucket, key, new Date(), 1800, {}, {'x-bce-range': '0-5'});
            })
            .then(function (url) {
                debug('url = %s', url);
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello ');
                return client.generatePresignedUrl(bucket, key);
            })
            .then(function (url) {
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello world');
            });
    });

    it('putObjectFromFile', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename);
            })
            .then(function () {
                return client.getObjectMetadata(bucket, path.basename(__filename));
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('' + fs.lstatSync(__filename).size);
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                return crypto.md5file(__filename)
                    .then(function (md5sum) {
                        expect(response.http_headers['content-md5']).to.eql(md5sum);
                    });
            });
    });

    it('putObjectFromFileWithContentLength', function () {
        var options = {
            'Content-Length': 100
        };
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename, options);
            })
            .then(function () {
                return client.getObjectMetadata(bucket, path.basename(__filename))
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('100');
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                return crypto.md5stream(fs.createReadStream(__filename, {start: 0, end: 99}))
                    .then(function (md5sum) {
                        expect(response.http_headers['content-md5']).to.eql(md5sum);
                    });
            });
    });

    it('createBucketFailed', function () {
        var invalidBucketName = 'invalid-bucket-你好\\&1231@#@#@';
        return client.createBucket(invalidBucketName)
            .catch(function (error) {
                expect(error.status_code).to.eql(400);
                expect(error.code).to.eql('InvalidBucketName');
                invalidBucketName = 'xinglubucket\'xinglubucket1213213123';
                return client.createBucket(invalidBucketName)
            })
            .catch(function (error) {
                expect(error.status_code).to.eql(400);
                expect(error.code).to.eql('InvalidBucketName');
            });
    });

    it('getObject', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename);
            })
            .then(function () {
                return client.getObject(bucket, path.basename(__filename));
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('' + fs.lstatSync(__filename).size);
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(Buffer.isBuffer(response.body)).to.eql(true);
                expect(response.body.length).to.eql(fs.lstatSync(__filename).size);
            });
    });

    it('getObjectFailed', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename);
            })
            .then(function () {
                return client.getObject(bucket, path.basename(__filename) + '.failed');
            })
            .catch(function (response) {
                expect(response.status_code).to.eql(404);
                expect(response.code).to.eql('NoSuchKey');
            });
    });

    it('getObjectWithRange', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename);
            })
            .then(function () {
                return client.getObject(bucket, path.basename(__filename), '9-19');
            })
            .then(function (response) {
                var filesize = fs.lstatSync(__filename).size;
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(response.http_headers['content-range']).to.eql('bytes 9-19/' + filesize);
                expect(Buffer.isBuffer(response.body)).to.eql(true);
                expect(response.body.length).to.eql(11);
            });
    });

    it('getObjectToFile', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename);
            })
            .then(function () {
                return client.getObjectToFile(bucket, path.basename(__filename), filename);
            })
            .then(function (response) {
                debug('response = %j', response);
                expect(fs.existsSync(filename)).to.eql(true);
                var filesize = fs.lstatSync(filename).size;
                expect(response.http_headers['content-length']).to.eql('' + filesize);
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(response.body).to.eql({});
                fs.unlinkSync(filename);
            });
    });

    it('getObjectToFileWithRange', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, path.basename(__filename), __filename);
            })
            .then(function () {
                return client.getObjectToFile(bucket, path.basename(__filename), filename, '9-19');
            })
            .then(function (response) {
                expect(fs.existsSync(filename)).to.eql(true);
                var filesize = fs.lstatSync(filename).size;
                expect(filesize).to.eql(11);
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                expect(response.body).to.eql({});
                fs.unlinkSync(filename);
            });
    });

    it('copyObjectAndCopyMeta', function () {
        var target_bucket_name = 'test-bucket-a-is-this';
        return client.createBucket(bucket)
            .then(function () {
                return client.createBucket(target_bucket_name);
            })
            .then(function () {
                return client.putObjectFromString(bucket, key, 'Hello World', {
                    'x-bce-meta-foo1': 'bar1',
                    'x-bce-meta-foo2': 'bar 2',
                    'x-bce-meta-foo3': 'bar 3 ',
                    'x-bce-meta-foo4': 'bar4 '
                });
            })
            .then(function () {
                return client.copyObject(bucket, key, target_bucket_name, key, {
                    'ETag': crypto.md5sum('Hello World', null, 'hex')
                });
            })
            .then(function () {
                return client.getObjectMetadata(target_bucket_name, key);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-meta-foo1']).to.eql('bar1');
                expect(response.http_headers['x-bce-meta-foo2']).to.eql('bar 2');
                expect(response.http_headers['x-bce-meta-foo3']).to.eql('bar 3');
                expect(response.http_headers['x-bce-meta-foo4']).to.eql('bar4');
            })

    });

    it('copyObjectWithCustomMeta', function () {
        var target_bucket_name = 'test-bucket-a-is-this';
        return client.createBucket(bucket)
            .then(function () {
                return client.createBucket(target_bucket_name);
            })
            .then(function () {
                return client.putObjectFromString(bucket, key, 'Hello World', {
                    'x-bce-meta-foo1': 'bar1',
                    'x-bce-meta-foo2': 'bar2',
                    'x-bce-meta-foo3': 'bar3',
                    'x-bce-meta-foo4': 'bar4'
                });
            })
            .then(function () {
                return client.copyObject(bucket, key, target_bucket_name, key, {
                    'ETag': crypto.md5sum('Hello World', null, 'hex'),
                    'x-bce-meta-bar1': 'foo1',
                    'x-bce-meta-bar2': 'foo2',
                    'x-bce-meta-bar3': 'foo3'
                });
            })
            .then(function () {
                return client.getObjectMetadata(target_bucket_name, key);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-meta-bar1']).to.eql('foo1');
                expect(response.http_headers['x-bce-meta-bar2']).to.eql('foo2');
                expect(response.http_headers['x-bce-meta-bar3']).to.eql('foo3');
            })

    });

    it('putObject without key', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObject(bucket, null, 'hello world');
            })
            .then(function () {
                expect().fail('SHOULD NOT REACH HERE.');
            }, function (error) {
                expect(error).to.be.a(Error);
            });
    });

    it('putObjectFromFile with customized md5 header', function () {
        return client.createBucket(bucket)
            .then(function () {
                return crypto.md5stream(fs.createReadStream(__filename))
            })
            .then(function (md5sum) {
                return client.putObjectFromFile(bucket, key, __filename, {
                    'Content-MD5': md5sum
                });
            })
            .then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('' +
                    fs.lstatSync(__filename).size);
            })

    });

    it('uploadPartFromDataUrl with invalid size', function () {
        return client.createBucket(bucket)
            .then(function () {
                var dataUrl = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).toString('base64');
                return client.uploadPartFromDataUrl(bucket, key, 'uploadId',
                    1, 10, dataUrl);
            })
            .then(function () {
                    expect().fail('SHOULD NOT REACH HERE.');
                },
                function (error) {
                    expect(error).to.be.a(TypeError);
                });
    });

    it('uploadPart with invalid parameters', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.uploadPart();
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.uploadPart(bucket);
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.uploadPart(bucket, key, 'uploadId', 0);
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.uploadPart(bucket, key, 'uploadId', 1, 10000 + 1);
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
            })

    });

    it('putObject with invalid content-length', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObject(bucket, key, new Buffer('hello world'), {
                    'Content-Length': -1
                });
            })
            .then(function () {
                expect().fail('SHOULD NOT REACH HERE.');
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.putObject(bucket, key, new Buffer('hello world'), {
                    'Content-Length': 5368709120 + 1  // 5G + 1
                });
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
            });
    });

    it('putObjectFromFile with invalid content-length', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromFile(bucket, key, __filename, {
                    'Content-Length': fs.lstatSync(__filename).size + 1
                })
            })
            .then(function () {
                expect().fail('SHOULD NOT REACH HERE.');
            }, function (error) {
                expect(error).to.be.a(Error);
            });
    });

    it('copyObject with invalid parameters', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.copyObject();
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.copyObject('sourceBucketName');
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.copyObject('sourceBucketName', 'sourceKey');
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
                return client.copyObject('sourceBucketName', 'sourceKey',
                    'targetBucketName');
            })
            .catch(function (error) {
                expect(error).to.be.a(TypeError);
            })

    });

    it('initiateMultipartUpload', function () {
        var uploadIds = [];
        return client.createBucket(bucket)
            .then(function () {
                return Q.all([
                    client.initiateMultipartUpload(bucket, key),
                    client.initiateMultipartUpload(bucket, key),
                    client.initiateMultipartUpload(bucket, key)
                ]);
            })
            .then(function (responses) {
                debug(responses);
                responses.forEach(function (response) {
                    uploadIds.push(response.body.uploadId);
                });
                return client.listMultipartUploads(bucket, {maxUploads: 10});
            })
            .then(function (response) {
                debug(response.body);
                expect(response.body.bucket).to.eql(bucket);
                expect(response.body.prefix).to.eql('');
                expect(response.body.keyMarker).to.eql('');
                expect(response.body.maxUploads).to.eql(10);
                expect(response.body.isTruncated).to.eql(false);
                expect(response.body.uploads).not.to.be(undefined);
                expect(response.body.uploads.length).to.eql(3);
            })
            .then(function (response) {
                var asyncTasks = uploadIds.map(function (uploadId) {
                    return client.abortMultipartUpload(bucket, key, uploadId);
                });
                return Q.all(asyncTasks);
            })

    });

    it('listParts with invalid parameters', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.listParts(bucket, key);
            })
            .then(function () {
                expect().fail('SHOULD NOT REACH HERE.');
            }, function (error) {
                expect(error).to.be.a(TypeError);
            });
    });

    it('listParts', function () {
        var uploadId;
        return client.createBucket(bucket)
            .then(function () {
                return client.initiateMultipartUpload(bucket, key);
            })
            .then(function (response) {
                uploadId = response.body.uploadId;
                var partSize = fs.lstatSync(__filename).size;
                return client.uploadPartFromFile(bucket, key, uploadId,
                    1, partSize, __filename, 0);
            })
            .then(function (response) {
                debug(response);
                return client.listParts(bucket, key, uploadId);
            })
            .then(function (response) {
                debug(response);
                var body = response.body;
                expect(body.bucket).to.eql(bucket);
                expect(body.key).to.eql(key);
                expect(body.initiated).not.to.be(undefined);
                expect(body.owner).not.to.be(undefined);
                expect(body.partNumberMarker).to.eql(0);
                expect(body.nextPartNumberMarker).to.eql(1);
                expect(body.maxParts).to.eql(1000);
                expect(body.isTruncated).to.eql(false);

                var part = body.parts[0];
                expect(part).not.to.be(undefined);
                expect(part.partNumber).to.eql(1);
                expect(part.lastModified).not.to.be(undefined);
                expect(part.eTag).not.to.be(undefined);
                expect(part.size).to.eql(fs.lstatSync(__filename).size);

                return client.abortMultipartUpload(bucket, key, uploadId);
            })

    });

    it('uploadPartFromFile', function () {
        var MIN_PART_SIZE = 5 * 1024 * 1024;
        var filesize = 20 * 1024 * 1024 + 317;
        prepareTemporaryFile(filesize);

        var upload_id = null;
        var part_list = [];
        var etags = '';
        return client.createBucket(bucket)
            .then(function () {
                return client.initiateMultipartUpload(bucket, key);
            })
            .then(function (response) {
                upload_id = response.body.uploadId;

                var left_size = filesize;
                var offset = 0;
                var part_number = 1;

                var defers = [];

                function uploadPartPromise(part_number, part_size, offset) {
                    return client.uploadPartFromFile(bucket, key, upload_id,
                        part_number, part_size, filename, offset);
                }

                while (left_size > 0) {
                    var part_size = Math.min(left_size, MIN_PART_SIZE);

                    defers.push(uploadPartPromise(part_number, part_size, offset));

                    left_size -= part_size;
                    offset += part_size;
                    part_number += 1;
                }

                return Q.all(defers);
            })
            .then(function (all_response) {
                u.each(all_response, function (response, index) {
                    part_list.push({
                        partNumber: index + 1,
                        eTag: response.http_headers['etag'],
                    });
                    etags += response.http_headers['etag'];
                });

                return client.completeMultipartUpload(bucket, key, upload_id, part_list);
            })
            .then(function (response) {
                fs.unlinkSync(filename);
                expect(response.body.eTag).to.eql(
                    '-' + crypto.md5sum(etags, null, 'hex')
                );
            })

    });

    it('testMultipartUploadSmallSuperfileX', function () {
        var MIN_PART_SIZE = 5 * 1024 * 1024;
        var filesize = 1 * 1024 * 1024 - 1;
        prepareTemporaryFile(filesize);

        var upload_id = null;
        var part_list = [];
        var etags = '';
        return client.createBucket(bucket)
            .then(function () {
                return client.initiateMultipartUpload(bucket, key);
            })
            .then(function (response) {
                upload_id = response.body.uploadId;

                var left_size = filesize;
                var offset = 0;
                var part_number = 1;

                var defers = [];

                function uploadPartPromise(part_number, part_size, offset) {
                    return client.uploadPartFromFile(bucket, key, upload_id,
                        part_number, part_size, filename, offset);
                }

                while (left_size > 0) {
                    var part_size = Math.min(left_size, MIN_PART_SIZE);

                    defers.push(uploadPartPromise(part_number, part_size, offset));

                    left_size -= part_size;
                    offset += part_size;
                    part_number += 1;
                }

                return Q.all(defers);
            })
            .then(function (all_response) {
                u.each(all_response, function (response, index) {
                    part_list.push({
                        partNumber: index + 1,
                        eTag: response.http_headers['etag'],
                    });
                    etags += response.http_headers['etag'];
                });

                return client.completeMultipartUpload(bucket, key, upload_id, part_list);
            })
            .then(function (response) {
                fs.unlinkSync(filename);
                expect(response.body.eTag).to.eql('e57598cd670284cf7d09e16ed9d4b2ac');
            })

    });

    it('append object from dataUrl', function () {
        return client.createBucket(bucket)
            .then(function () {
                var dataUrl = new Buffer('hello ').toString('base64');
                return client.appendObjectFromDataUrl(bucket, key, dataUrl, null);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('6');
                var dataUrl = new Buffer('world').toString('base64');
                return client.appendObjectFromDataUrl(bucket, key, dataUrl, 6);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));
            })
    });

    it('append Object From String2', function () {
        var objectName = '/this/is/a/file.txt';
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, objectName, 'hello ', null);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('6');
                return client.appendObjectFromString(bucket, objectName, 'world', 6);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                return client.getObjectMetadata(bucket, objectName);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));

                return client.generatePresignedUrl(bucket, objectName, new Date(), 1800, {}, {'x-bce-range': '0-5'});
            })
            .then(function (url) {
                debug('url = %s', url);
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello ');
                return client.generatePresignedUrl(bucket, objectName);
            })
            .then(function (url) {
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello world');
            });
    });

    it('append Object From String', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello ', null);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('6');
                return client.appendObjectFromString(bucket, key, 'world', 6);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));

                return client.generatePresignedUrl(bucket, key, new Date(), 1800, {}, {'x-bce-range': '0-5'});
            })
            .then(function (url) {
                debug('url = %s', url);
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello ');
                return client.generatePresignedUrl(bucket, key);
            })
            .then(function (url) {
                return helper.get(url);
            })
            .then(function (body) {
                expect(body.toString()).to.eql('hello world');
            })
    });

    it('append Object From File', function () {
        var fileSize = fs.lstatSync(__filename).size;
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromFile(bucket, path.basename(__filename), __filename, null, 1);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('1');
                return client.appendObjectFromFile(bucket, path.basename(__filename), __filename, 1, fileSize - 1);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('' + fileSize);
                return client.getObjectMetadata(bucket, path.basename(__filename));
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('' + fileSize);
                expect(response.http_headers['content-type']).to.eql('application/javascript');
                return crypto.md5file(__filename)
                    .then(function (md5sum) {
                        expect(response.http_headers['content-md5']).to.eql(md5sum);
                    });
            });
    });

    it('appendObjectWithInvalidSHA256', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', null, {
                        'x-bce-content-sha256': 'hahahaha'
                    })
                    .then(function () {
                        fail('should not reach here');
                    }, function (error) {
                        expect(error.status_code).to.eql(400);
                        expect(error.code).to.eql('BadDigest');
                    })
            });
    });

    it('overwrite a normal object', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromString(bucket, key, 'hello world');
            })
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', null);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                expect(response.http_headers['x-bce-object-type']).to.eql('Appendable');
            })
    });

    it('overwrite by a appendable object', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', null);
            })
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', 11);
            })
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', null);
            })
            .then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['content-length']).to.eql('11');
                expect(response.http_headers['content-md5']).to.eql(crypto.md5sum('hello world'));
                expect(response.http_headers['x-bce-next-append-offset']).to.eql('11');
                expect(response.http_headers['x-bce-object-type']).to.eql('Appendable');
            })
    });

    it('append to a normal object', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.putObjectFromString(bucket, key, 'hello world');
            })
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', 11)
                    .then(function () {
                        fail('should not reach here');
                    }, function (error) {
                        expect(error.status_code).to.eql(403);
                        expect(error.code).to.eql('ObjectUnappendable');
                    });
            })
    });

    it('append object with invalid offset1', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', 11)
                    .then(function () {
                        fail('should not reach here');
                    }, function (error) {
                        expect(error.status_code).to.eql(404);
                    });
            })
    });
    it('append object with invalid offset2', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello ', null)
            }).then(function () {
                return client.appendObjectFromString(bucket, key, 'hello world', 11)
                    .then(function () {
                        fail('should not reach here');
                    }, function (error) {
                        expect(error.status_code).to.eql(409);
                        expect(error.code).to.eql('OffsetIncorrect');
                    });
            });
    });

    it('append object with custom metadata', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello ', null, {
                    'x-bce-meta-foo': 'bar'
                })
            }).then(function () {
                return client.appendObjectFromString(bucket, key, 'world', 6, {
                    'x-bce-meta-foo': 'bar1'
                });
            }).then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-meta-foo']).to.eql('bar');
            });
    });

    it('copy a appendable object', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello ', null)
            }).then(function () {
                return client.appendObjectFromString(bucket, key, 'world', 6);
            }).then(function () {
                return client.copyObject(bucket, key, bucket, key + key)
                    .then(function () {
                        fail('SHOULD NOT REACH HERE.');
                    }, function (error) {
                        expect(error.status_code).to.eql(400);
                        expect(error.code).to.eql('NotAllowCopy');
                    });
            });
    });

    it('copy a appendable object itself', function () {
        return client.createBucket(bucket)
            .then(function () {
                return client.appendObjectFromString(bucket, key, 'hello ', null, {
                    'x-bce-meta-foo': 'bar'
                })
            }).then(function () {
                return client.appendObjectFromString(bucket, key, 'world', 6, {
                    'x-bce-meta-foo': 'bar1'
                });
            }).then(function () {
                return client.copyObject(bucket, key, bucket, key, {
                    'x-bce-meta-foo': 'bar3'
                });
            }).then(function () {
                return client.getObjectMetadata(bucket, key);
            })
            .then(function (response) {
                expect(response.http_headers['x-bce-meta-foo']).to.eql('bar3');
                expect(response.http_headers['x-bce-object-type']).to.eql('Appendable');
            });
    });
});

/* vim: set ts=4 sw=4 sts=4 tw=120: */

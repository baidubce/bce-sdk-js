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

import expect from 'expect.js';

import Auth from '../../src/auth';
import HttpClient from '../../src/http_client';
import WMStream from '../../src/wm_stream';
import helper from './helper';

import {bos as config} from '../config';

function sign_function(credentials, http_method, path, params, headers) {
    var auth = new Auth(credentials.ak, credentials.sk);
    return auth.generateAuthorization(http_method, path, params || {}, headers || {});
}

describe('HttpClient', function() {
    var fail;

    this.timeout(10 * 60 * 1000);

    beforeEach(function() {
        fail = helper.fail(this);
    });

    xit('invalidUrl', function() {
        var config = {
            'endpoint': 'http://no-such-url',
        };
        var client = new HttpClient(config);
        return client.sendRequest('GET', '/')
            .then(
                function() {
                    fail('Should not reach here');
                },
                function(e) {
                    expect(e.code).to.eql('ENOTFOUND');
                }
            );
    });

    it('get', function() {
        var config = {
            'endpoint': 'https://bs.baidu.com'
        };
        var client = new HttpClient(config);

        return client.sendRequest('GET', '/adtest/test.json')
            .then(function(response) {
                expect(response.body).to.eql({hello: 'world'});
                expect(response.http_headers['content-type']).to.eql('text/json');
                expect(response.http_headers.server).to.eql('POMS/CloudUI 1.0');
                expect(response.http_headers.etag).to.eql('d0b8560f261410878a68bbe070d81853');
            });
    });

    it('invalidHttpStatus', function() {
        var config = {
            'endpoint': 'https://bs.baidu.com'
        };
        var client = new HttpClient(config);
        return client.sendRequest('GET', '/')
            .then(
                function(){ fail('Should not reach here'); },
                function(e) {
                    expect(e.status_code).to.eql(403);
                }
            );
    });

    it('sendRequest', function() {
        var client = new HttpClient(config);

        return client.sendRequest('GET', '/v1', null, null, null, sign_function)
            .then(
                function(response) {
                    expect(response.http_headers['content-type']).to.eql('application/json; charset=utf-8');
                    expect(response.http_headers.hasOwnProperty('x-bce-request-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('x-bce-debug-id')).to.eql(true);
                    expect(response.body.owner).to.eql(config.account);
                    expect(Array.isArray(response.body.buckets)).to.eql(true);
                }
            );
    });


    it('readRequestBodyFromBuffer', function() {
        var grant_list = [
            {
                grantee: [
                    {id: '992c67ee10be4e85bf444d18b638f9ba'},
                    {id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}
                ],
                permission: ['FULL_CONTROL']
            }
        ];
        var bucket = 'no-such-bucket-name';

        // Prepare the request body
        var body = new Buffer(JSON.stringify({accessControlList: grant_list}));

        var client = new HttpClient(config);
        var path = '/v1/' + bucket;


        return client.sendRequest('DELETE', path, null, null, null, sign_function)
            .then(start, start);

        function start() {
            // Create the bucket
            return client.sendRequest('PUT', path, null, null, null, sign_function)
                .then(function(x) {
                    // Set bucket acl
                    var params = {'acl': ''};
                    return client.sendRequest('PUT', path, body, null, params, sign_function);
                })
                .then(function(response) {
                    expect(response.http_headers.hasOwnProperty('x-bce-request-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('x-bce-debug-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('content-length')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('date')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('server')).to.eql(true);
                    expect(response.body).to.eql({});
                })
                .then(function() {
                    return client.sendRequest('DELETE', path, null, null, null, sign_function);
                });
        }
    });

    it('readRequestBodyFromString', function() {
        var grant_list = [
            {
                grantee: [
                    {id: '992c67ee10be4e85bf444d18b638f9ba'},
                    {id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}
                ],
                permission: ['FULL_CONTROL']
            }
        ];
        var bucket = 'no-such-bucket-name';

        // Prepare the request body
        var body = JSON.stringify({accessControlList: grant_list});

        var client = new HttpClient(config);
        var path = '/v1/' + bucket;


        client.sendRequest('DELETE', path, null, null, null, sign_function)
            .then(start, start);

        function start() {
            // Create the bucket
            client.sendRequest('PUT', path, null, null, null, sign_function)
                .then(function(x) {
                    // Set bucket acl
                    var params = {'acl': ''};
                    return client.sendRequest('PUT', path, body, null, params, sign_function);
                })
                .then(function(response) {
                    expect(response.http_headers.hasOwnProperty('x-bce-request-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('x-bce-debug-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('content-length')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('date')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('server')).to.eql(true);
                    expect(response.body).to.eql({});
                })
                .then(function() {
                    return client.sendRequest('DELETE', path, null, null, null, sign_function);
                })
                .catch(fail)
                .fin();
        }
    });

    it('readRequestBodyFromStream', function() {
        var grant_list = [
            {
                grantee: [
                    {id: '992c67ee10be4e85bf444d18b638f9ba'},
                    {id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}
                ],
                permission: ['FULL_CONTROL']
            }
        ]
        var bucket = 'no-such-bucket-name';

        var access_control_list = JSON.stringify({accessControlList: grant_list});
        // Prepare the request body
        var Readable = require('stream').Readable
        var body = new Readable();
        body.push(access_control_list);
        body.push(null);

        var client = new HttpClient(config);
        var path = '/v1/' + bucket;


        client.sendRequest('DELETE', path, null, null, null, sign_function)
            .then(start, start);

        function start() {
            // Create the bucket
            client.sendRequest('PUT', path, null, null, null, sign_function)
                .then(function(x) {
                    // Set bucket acl
                    var params = {'acl': ''};
                    var headers = {'Content-Length': Buffer.byteLength(access_control_list)};
                    return client.sendRequest('PUT', path, body, headers, params, sign_function);
                })
                .then(function(response) {
                    expect(response.http_headers.hasOwnProperty('x-bce-request-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('x-bce-debug-id')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('content-length')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('date')).to.eql(true);
                    expect(response.http_headers.hasOwnProperty('server')).to.eql(true);
                    expect(response.body).to.eql({});
                })
                .then(function() {
                    return client.sendRequest('DELETE', path, null, null, null, sign_function);
                })
                .catch(fail)
                .fin();
        }
    });

    it('sendRequestWithOutputStream', function() {
        var client = new HttpClient(config);

        var output_stream = new WMStream();
        client.sendRequest('GET', '/v1', null, null, null, sign_function, output_stream)
            .then(function(response) {
                expect(response.body).to.eql({});
                expect(output_stream.store.length).to.be.greaterThan(0);
                var owner = JSON.parse(output_stream.store.toString()).owner;
                expect(owner).to.eql(config.account);
            })
            .catch(fail)
            .fin();
    });
});










/* vim: set ts=4 sw=4 sts=4 tw=120: */

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
 * @file auth.spec.js
 * @author leeight
 */

import expect from 'expect.js';

import Auth from '../../src/auth';
import strings from '../../src/strings';

describe('Auth', function () {
    it('queryStringCanonicalization', function () {
        var auth = new Auth('ak', 'sk');

        var params = {
            A: 'A',
            B: null,
            C: ''
        };
        expect(auth.queryStringCanonicalization(params)).to.eql('A=A&B=&C=');
    });

    it('uriCanonicalization', function () {
        var auth = new Auth('ak', 'sk');

        expect(strings.normalize('!\'()*this is an example for 测试'))
            .to.eql('%21%27%28%29%2Athis%20is%20an%20example%20for%20%E6%B5%8B%E8%AF%95');
    });

    it('headersCanonicalization', function () {
        var auth = new Auth('ak', 'sk');

        var headers = {
            'Host': 'localhost',
            'x-bce-a': 'a/b:c',
            'C': ''
        };

        var rv = auth.headersCanonicalization(headers);
        var signedHeaders = rv[1];
        expect(signedHeaders).to.eql([
            'host',
            'x-bce-a'
        ]);

        headers['Content-MD5'] = 'MD5';
        rv = auth.headersCanonicalization(headers);
        var canonicalHeaders = rv[0];
        expect(canonicalHeaders).to.eql('content-md5:MD5\nhost:localhost\nx-bce-a:a%2Fb%3Ac');
    });

    it('generateAuthorization', function () {
        var auth = new Auth('my_ak', 'my_sk');

        var method = 'PUT';
        var uri = '/v1/bucket/object1';
        var params = {
            A: null,
            b: '',
            C: 'd'
        };
        var headers = {
            'Host': 'bce.baidu.com',
            'abc': '123',
            'x-bce-meta-key1': 'ABC'
        };

        var signature = auth.generateAuthorization(method, uri, params, headers, 1402639056);
        expect(signature).to.eql('bce-auth-v1/my_ak/2014-06-13T05:57:36Z/1800/host;x-bce-meta-key1/'
                                  + '80c9672aca2ea9af4bb40b9a8ff458d72df94e97d550840727f3a929af271d25');

        signature = auth.generateAuthorization(method, uri, params, headers, 1402639056, 1800);
        expect(signature).to.eql('bce-auth-v1/my_ak/2014-06-13T05:57:36Z/1800/host;'
                                  + 'x-bce-meta-key1/80c9672aca2ea9af4bb40b9a8ff458d72'
                                  + 'df94e97d550840727f3a929af271d25');

        method = 'DELETE';
        uri = '/v1/test-bucket1361199862';
        params = {};
        headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': 0,
            'User-Agent': 'This is the user-agent'
        };
        signature = auth.generateAuthorization(method, uri, params, headers, 1402639056, 1800);
        expect(signature).to.eql('bce-auth-v1/my_ak/2014-06-13T05:57:36Z/1800/'
                                  + 'content-length;content-type/'
                                  + 'c9386b15d585960ae5e6972f73ed92a9a682dc81025480ba5b41206d3e489822');
    });
});


/* vim: set ts=4 sw=4 sts=4 tw=120: */

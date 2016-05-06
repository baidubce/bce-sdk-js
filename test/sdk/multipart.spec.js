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
 */

import expect from 'expect.js';

import Multipart from '../../src/multipart';

describe('Multipart', function () {
    it('invalid data type', function () {
        var multipart = new Multipart('hahaha');
        try {
            multipart.addPart('accessKey', null);
            expect().fail('SHOULD NOT REACH HERE');
        }
        catch (ex) {
            expect(ex).to.be.an(Error);
        }
    });

    it('encode', function () {
        var multipart = new Multipart('hahaha');
        multipart.addPart('accessKey', '499d0610679c4da2a69b64086a4cc3bc');
        multipart.addPart('policy', 'eyJleHBpcmF0aW9uIjoiMjA=');
        multipart.addPart('signature', 'd1a617a725122c20319');
        multipart.addPart('key', new Buffer('world.txt'));
        multipart.addPart('Content-Disposition', 'attachment;filename="download/object"');
        multipart.addPart('x-bce-meta-object-tag', new Buffer('test1'));

        var encoded = multipart.encode().toString();
        expect(encoded).to.eql(
            '--hahaha\r\n' +
            'Content-Disposition: form-data; name="accessKey"\r\n\r\n' +
            '499d0610679c4da2a69b64086a4cc3bc\r\n' +
            '--hahaha\r\n' +
            'Content-Disposition: form-data; name="policy"\r\n\r\n' +
            'eyJleHBpcmF0aW9uIjoiMjA=\r\n' +
            '--hahaha\r\n' +
            'Content-Disposition: form-data; name="signature"\r\n\r\n' +
            'd1a617a725122c20319\r\n' +
            '--hahaha\r\n' +
            'Content-Disposition: form-data; name="key"\r\n\r\n' +
            'world.txt\r\n' +
            '--hahaha\r\n' +
            'Content-Disposition: form-data; name="Content-Disposition"\r\n\r\n' +
            'attachment;filename="download/object"\r\n' +
            '--hahaha\r\n' +
            'Content-Disposition: form-data; name="x-bce-meta-object-tag"\r\n\r\n' +
            'test1\r\n' +
            '--hahaha--'
        );
    });
});










/* vim: set ts=4 sw=4 sts=4 tw=120: */

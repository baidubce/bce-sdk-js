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
 * @file src/multipart.js
 * @author leeight
 */

import util from 'util';

import u from 'underscore';

export default class Multipart {
    constructor(boundary) {
        this._boundary = boundary;
        this._parts = [];
    }


    addPart(name, data) {
        let part = [];

        let header = util.format(
            '--%s\r\nContent-Disposition: form-data; name="%s"%s\r\n\r\n',
            this._boundary, name, '');
        part.push(new Buffer(header));

        if (Buffer.isBuffer(data)) {
            part.push(data);
            part.push(new Buffer('\r\n'));
        }
        else if (u.isString(data)) {
            part.push(new Buffer(data + '\r\n'));
        }
        else {
            throw new Error('Invalid data type.');
        }

        this._parts.push(Buffer.concat(part));
    }

    encode() {
        return Buffer.concat(
            [
                Buffer.concat(this._parts),
                new Buffer(util.format('--%s--', this._boundary))
            ]
        );
    }
}

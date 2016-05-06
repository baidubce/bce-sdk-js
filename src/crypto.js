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
 * @file src/crypto.js
 * @author leeight
 */

/* eslint-env node */

import fs from 'fs';
import crypto from 'crypto';

import Q from 'q';

let md5sum = (data, enc, digest) => {
    if (!Buffer.isBuffer(data)) {
        data = new Buffer(data, enc || 'UTF-8');
    }

    let md5 = crypto.createHash('md5');
    md5.update(data);

    return md5.digest(digest || 'base64');
};

let md5stream = (stream, digest) => {
    let deferred = Q.defer();

    let md5 = crypto.createHash('md5');
    stream.on('data', chunk => md5.update(chunk));
    stream.on('end', () => deferred.resolve(md5.digest(digest || 'base64')));
    stream.on('error', error => deferred.reject(error));

    return deferred.promise;
};

let md5file = (filename, digest) => md5stream(fs.createReadStream(filename), digest);

let md5blob = (blob, digest) => {
    let deferred = Q.defer();

    let reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onerror = e => deferred.reject(reader.error);
    reader.onloadend = e => {
        if (e.target.readyState === FileReader.DONE) {
            let content = e.target.result;
            let md5 = md5sum(content, null, digest);
            deferred.resolve(md5);
        }
    };
    return deferred.promise;
};

export default {
    md5sum,
    md5stream,
    md5file,
    md5blob
};










/* vim: set ts=4 sw=4 sts=4 tw=120: */

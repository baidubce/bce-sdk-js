/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/crypto.js
 * @author leeight
 */

/* eslint-env node */

var fs = require('fs');
var crypto = require('crypto');

var Q = require('q');

exports.md5sum = function (data, enc, digest) {
    if (!Buffer.isBuffer(data)) {
        data = new Buffer(data, enc || 'UTF-8');
    }

    var md5 = crypto.createHash('md5');
    md5.update(data);

    return md5.digest(digest || 'base64');
};

exports.md5stream = function (stream, digest) {
    var deferred = Q.defer();

    var md5 = crypto.createHash('md5');
    stream.on('data', function (chunk) {
        md5.update(chunk);
    });
    stream.on('end', function () {
        deferred.resolve(md5.digest(digest || 'base64'));
    });
    stream.on('error', function (error) {
        deferred.reject(error);
    });

    return deferred.promise;
};

exports.md5file = function (filename, digest) {
    return exports.md5stream(fs.createReadStream(filename), digest);
};

exports.md5blob = function (blob, digest) {
    var deferred = Q.defer();

    var reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onerror = function (e) {
        deferred.reject(reader.error);
    };
    reader.onloadend = function (e) {
        if (e.target.readyState === FileReader.DONE) {
            var content = e.target.result;
            var md5 = exports.md5sum(content, null, digest);
            deferred.resolve(md5);
        }
    };
    return deferred.promise;
};











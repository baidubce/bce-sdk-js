/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/multipart.js
 * @author leeight
 */

var util = require('util');

var u = require('underscore');

/**
 * Multipart Encoder
 *
 * @param {string} boundary The multipart boundary.
 * @constructor
 */
function Multipart(boundary) {
    this._boundary = boundary;

    /**
     * @type {Array.<Buffer>}
     */
    this._parts = [];
}

/**
 * Add a part
 *
 * @param {string} name The part name.
 * @param {string|Buffer} data The part data.
 */
Multipart.prototype.addPart = function (name, data) {
    var part = [];

    var header = util.format(
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
};

Multipart.prototype.encode = function () {
    return Buffer.concat(
        [
            Buffer.concat(this._parts),
            new Buffer(util.format('--%s--', this._boundary))
        ]
    );
};

module.exports = Multipart;











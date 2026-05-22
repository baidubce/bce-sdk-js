/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/wm_stream.js
 * @author leeight
 */

/* eslint-env node */

var stream = require('stream');
var util = require('util');

/**
 * Writable memory stream, which can be
 * used a http_client output stream.
 *
 * @constructor
 */
function WMStream() {
    stream.Writable.call(this);

    this.store = [];
}
util.inherits(WMStream, stream.Writable);

WMStream.prototype._write = function (chunk, enc, cb) {
    var buffer = Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk, enc);
    this.store.push(buffer);

    cb();
};

module.exports = WMStream;


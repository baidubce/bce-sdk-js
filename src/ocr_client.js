/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/ocr_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');

var debug = require('debug')('bce-sdk:OCRClient');

var BceBaseClient = require('./bce_base_client');

/**
 * OCR API
 *
 * @see http://gollum.baidu.com/bceocrapi
 * @constructor
 * @param {Object} config The face client configuration.
 * @extends {BceBaseClient}
 */
function OCRClient(config) {
    BceBaseClient.call(this, config, 'face', true);
}
util.inherits(OCRClient, BceBaseClient);

// --- BEGIN ---

OCRClient.prototype._apiCall = function (url, data, language, options) {
    debug('url = %j, data = %j, language = %j, options = %j',
        url, data, language, options);

    options = options || {};

    var body = {};
    if (Buffer.isBuffer(data)) {
        body = {
            base64: data.toString('base64')
        };
    }
    else {
        body = {
            bosPath: data
        };
    }

    if (language) {
        body.language = language;
    }

    return this.sendRequest('POST', url, {
        body: JSON.stringify(body),
        config: options.config
    });
};

OCRClient.prototype.allText = function (data, language, options) {
    return this._apiCall('/v1/recognize/text', data, language, options);
};

OCRClient.prototype.oneLine = function (data, language, options) {
    return this._apiCall('/v1/recognize/line', data, language, options);
};

OCRClient.prototype.singleCharacter = function (data, language, options) {
    return this._apiCall('/v1/recognize/character', data, language, options);
};

module.exports = OCRClient;










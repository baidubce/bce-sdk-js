/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/ses_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
var fs = require('fs');
var path = require('path');
var util = require('util');

var BceBaseClient = require('./bce_base_client');

/**
 * SES service api
 *
 * @constructor
 * @param {Object} config The bos client configuration.
 * @extends {BceBaseClient}
 */
function SesClient(config) {
    BceBaseClient.call(this, config, 'ses', true);
}
util.inherits(SesClient, BceBaseClient);

// --- B E G I N ---
SesClient.prototype.addVerifiedEmail = function (email) {
    var url = '/v1/verifiedEmail/' + encodeURIComponent(email);
    return this.sendRequest('PUT', url);
};

SesClient.prototype.getAllVerifiedEmails = function () {
    var url = '/v1/verifiedEmail';
    return this.sendRequest('GET', url);
};

SesClient.prototype.getVerifiedEmail = function (email) {
    var url = '/v1/verifiedEmail/' + encodeURIComponent(email);
    return this.sendRequest('GET', url);
};

SesClient.prototype.deleteVerifiedEmail = function (email) {
    var url = '/v1/verifiedEmail/' + encodeURIComponent(email);
    return this.sendRequest('DELETE', url);
};

SesClient.prototype.getQuota = function () {
    var url = '/v1/quota';
    return this.sendRequest('GET', url);
};

SesClient.prototype.setQuota = function (quota) {
    var url = '/v1/quota';
    Object.keys(quota).forEach(function (key) {
        var value = quota[key];
        // 如果是 number，传递到后端会出错的
        quota[key] = value.toString();
    });

    return this.sendRequest('PUT', url, {
        body: JSON.stringify(quota)
    });
};

SesClient.prototype.sendMail = function (mailOptions) {
    var source = { from: '', name: '' };

    if (typeof mailOptions.from === 'string') {
      source.from = mailOptions.from;
      source.name = mailOptions.from.indexOf('@') !== -1 ? mailOptions.from.split('@')[0] : '';
    } else if (mailOptions.from && mailOptions.from.addr) {
      source.from = mailOptions.from.addr;
      source.name = mailOptions.from.name ?
        mailOptions.from.name :
        mailOptions.from.addr.indexOf('@') !== -1 ? mailOptions.from.addr.split('@')[0] : '';
    }

    var to = mailOptions.to || [];
    if (typeof to === 'string') {
        to = [to];
    }

    var cc = mailOptions.cc || [];
    if (typeof cc === 'string') {
        cc = [cc];
    }

    var bcc = mailOptions.bcc || [];
    if (typeof bcc === 'string') {
        bcc = [bcc];
    }

    var subject = mailOptions.subject;
    var text = mailOptions.text || '';
    var html = mailOptions.html || '';
    var attachments = mailOptions.attachments || [];

    attachments = attachments.map(function (item) {
        if (typeof item === 'string') {
            return {
                /* eslint-disable */
                file_name: path.basename(item),
                file_data: {
                    data: fs.readFileSync(item).toString('base64')
                }
                /* eslint-enable */
            };
        }

        return item;
    });

    var url = '/v1/email';
    var body = JSON.stringify({
        mail: {
            source: source,
            destination: {
                /* eslint-disable */
                to_addr: to.map(function (item) {
                    return {
                        addr: item
                    };
                }),
                cc_addr: cc.map(function (item) {
                    return {
                        addr: item
                    };
                }),
                bcc_addr: bcc.map(function (item) {
                    return {
                        addr: item
                    };
                })
                /* eslint-enable */
            },
            subject: {
                charset: 1,
                data: subject
            },
            priority: 1,
            message: {
                text: {
                    charset: 1,
                    data: text
                },
                html: {
                    charset: 1,
                    data: html
                }
            },
            attachments: attachments
        }
    });

    return this.sendRequest('POST', url, {body: body});
};

// --- E   N   D ---

module.exports = SesClient;






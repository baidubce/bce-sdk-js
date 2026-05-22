/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/face_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');

var u = require('underscore');
var debug = require('debug')('bce-sdk:FaceClient');

var BceBaseClient = require('./bce_base_client');


/**
 * 人脸识别API
 *
 * @see http://gollum.baidu.com/bcefaceapi
 * @constructor
 * @param {Object} config The face client configuration.
 * @extends {BceBaseClient}
 */
function FaceClient(config) {
    BceBaseClient.call(this, config, 'face', true);
}
util.inherits(FaceClient, BceBaseClient);

// --- BEGIN ---

FaceClient.prototype.createApp = function (options) {
    options = options || {};

    var url = '/v1/app';
    return this.sendRequest('POST', url, {
        config: options.config
    });
};

FaceClient.prototype.listApps = function (options) {
    options = options || {};

    var url = '/v1/app';
    return this.sendRequest('GET', url, {
        config: options.config
    });
};

FaceClient.prototype.createGroup = function (appId, groupName, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/group';
    return this.sendRequest('POST', url, {
        body: JSON.stringify({groupName: groupName}),
        config: options.config
    });
};

FaceClient.prototype.deleteGroup = function (appId, groupName, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/group/' + groupName;
    return this.sendRequest('DELETE', url, {
        config: options.config
    });
};

FaceClient.prototype.getGroup = function (appId, groupName, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/group/' + groupName;
    return this.sendRequest('GET', url, {
        config: options.config
    });
};

FaceClient.prototype.listGroups = function (appId, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/group';
    return this.sendRequest('GET', url, {
        config: options.config
    });
};

FaceClient.prototype.createPerson = function (appId, groupName, personName, faces, options) {
    options = options || {};

    faces = faces.map(function (item) {
        return {
            bosPath: item
        };
    });

    debug('Create Person Faces = %j', faces);

    var url = '/v1/app/' + appId + '/person';
    return this.sendRequest('POST', url, {
        body: JSON.stringify({
            personName: personName,
            groupName: groupName,
            faces: faces
        }),
        config: options.config
    });
};

FaceClient.prototype.deletePerson = function (appId, personName, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/person/' + personName;
    return this.sendRequest('DELETE', url, {
        config: options.config
    });
};

FaceClient.prototype.updatePerson = function (appId, personName, faces, options) {
    options = options || {};

    faces = faces.map(function (item) {
        return {
            bosPath: item
        };
    });

    var url = '/v1/app/' + appId + '/person/' + personName;
    return this.sendRequest('PUT', url, {
        body: JSON.stringify({faces: faces}),
        config: options.config
    });
};

FaceClient.prototype.getPerson = function (appId, personName, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/person/' + personName;
    return this.sendRequest('GET', url, {
        config: options.config
    });
};

FaceClient.prototype.listPersons = function (appId, options) {
    options = options || {};

    var url = '/v1/app/' + appId + '/person';
    var params = u.pick(options, 'groupName');
    return this.sendRequest('GET', url, {
        params: params,
        config: options.config
    });
};

FaceClient.prototype.identify = function (appId, groupName, data, options) {
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

    var url = '/v1/app/' + appId + '/group/' + groupName;
    return this.sendRequest('POST', url, {
        params: {identify: ''},
        body: JSON.stringify(body),
        config: options.config
    });

};

FaceClient.prototype.verify = function (appId, personName, data, options) {
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

    var url = '/v1/app/' + appId + '/person/' + personName;
    return this.sendRequest('POST', url, {
        params: {verify: ''},
        body: JSON.stringify(body),
        config: options.config
    });
};

// --- E N D ---

module.exports = FaceClient;










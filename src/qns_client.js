/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/qns_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');

var u = require('underscore');

var BceBaseClient = require('./bce_base_client');

/**
 * QNS service api
 *
 * @constructor
 * @param {Object} config The bos client configuration.
 * @param {string} account The topic account.
 * @param {string} name The topic name.
 * @extends {BceBaseClient}
 */
function Topic(config, account, name) {
    BceBaseClient.call(this, config, 'qns', true);

    /**
     * The topic accunt.
     *
     * @private
     * @type {string}
     */
    this._account = account;

    /**
     * The topic name.
     *
     * @private
     * @type {string}
     */
    this._name = name;
}
util.inherits(Topic, BceBaseClient);

// --- B E G I N ---

Topic.prototype._buildUrl = function () {
    var url = '/v1/' + this._account + '/topic/' + this._name;
    return url;
};

Topic.prototype.create = function (options) {
    options = options || {};

    var params = u.pick(options, 'delayInSeconds',
        'maximumMessageSizeInBytes', 'messageRetentionPeriodInSeconds');

    return this.sendRequest('PUT', this._buildUrl(), {
        body: JSON.stringify(params)
    });
};

Topic.prototype.remove = function () {
    return this.sendRequest('DELETE', this._buildUrl());
};

Topic.prototype.get = function () {
    return this.sendRequest('GET', this._buildUrl());
};

Topic.prototype.update = function (options) {
    options = options || {};

    var params = u.pick(options, 'delayInSeconds',
        'maximumMessageSizeInBytes', 'messageRetentionPeriodInSeconds');

    return this.sendRequest('PUT', this._buildUrl(), {
        headers: {
            'If-Match': '*'
        },
        body: JSON.stringify(params)
    });
};

/**
 * 发送消息到topic中去，单个请求不超过256KB。单次发送的消息个数不超过1000。
 *
 * @param {Array.<string|Object>} messages 需要发送的消息内容，可能是多个.
 * @return {Q.Promise}
 */
Topic.prototype.sendMessages = function (messages) {
    var url = this._buildUrl() + '/message';

    messages = u.map(messages, function (item) {
        if (u.isString(item)) {
            return {
                messageBody: item
            };
        }
        // {
        //   messageBody: string,
        //   // 0 - 3600
        //   delayInSeconds: number
        // }
        return item;
    });

    return this.sendRequest('POST', url, {
        body: JSON.stringify({messages: messages})
    });
};

Topic.prototype.list = function (options) {
    options = options || {};

    var params = u.pick(options, 'marker', 'maxRecords');

    var url = '/v1/' + this._account + '/topic';
    return this.sendRequest('GET', url, {
        params: params
    });
};

Topic.prototype.createSubscription = function (subscriptionName, options) {
    options = options || {};

    var s = new Subscription(this.config, this._account, subscriptionName);

    if (options.topic == null) {
        options.topic = this._name;
    }

    return s.create(options);
};

// --- E   N   D ---

/**
 * QNS service api
 *
 * @constructor
 * @param {Object} config The bos client configuration.
 * @param {string} account The subscription account.
 * @param {string} name The subscription name.
 * @extends {BceBaseClient}
 */
function Subscription(config, account, name) {
    BceBaseClient.call(this, config, 'qns', true);

    /**
     * The topic accunt.
     *
     * @private
     * @type {string}
     */
    this._account = account;

    /**
     * The topic name.
     *
     * @private
     * @type {string}
     */
    this._name = name;

}
util.inherits(Subscription, BceBaseClient);

// --- B E G I N ---

Subscription.prototype._buildUrl = function () {
    var url = '/v1/' + this._account + '/subscription/' + this._name;
    return url;
};

Subscription.prototype.create = function (options) {
    options = options || {};

    var params = u.pick(options,
        // 1 - 20 (0)
        'receiveMessageWaitTimeInSeconds',
        'topic',
        // 1 - 43200 (30)
        'visibilityTimeoutInSeconds',
        'pushConfig'
    );

    return this.sendRequest('PUT', this._buildUrl(), {
        body: JSON.stringify(params)
    });
};

Subscription.prototype.remove = function () {
    return this.sendRequest('DELETE', this._buildUrl());
};

Subscription.prototype.get = function () {
    return this.sendRequest('GET', this._buildUrl());
};

Subscription.prototype.update = function (options) {
    options = options || {};

    var params = u.pick(options,
        'receiveMessageWaitTimeInSeconds',
        'visibilityTimeoutInSeconds'
    );

    return this.sendRequest('PUT', this._buildUrl(), {
        headers: {
            'If-Match': '*'
        },
        body: JSON.stringify(params)
    });
};

Subscription.prototype.receiveMessages = function (options) {
    options = options || {};

    var params = u.pick(options,
        'waitInSeconds',
        'maxMessages',
        'peek'
    );

    var url = this._buildUrl() + '/message';
    // FIXME 居然 GET 请求需要带着 Request Body，这奇怪！！！
    return this.sendRequest('GET', url, {
        body: JSON.stringify(params)
    });
};

Subscription.prototype.deleteMessage = function (handle) {
    var url = this._buildUrl() + '/message';
    return this.sendRequest('DELETE', url, {
        params: {
            receiptHandle: handle
        }
    });
};

Subscription.prototype.changeVisibility = function (handle, seconds) {
    var url = this._buildUrl() + '/message';
    return this.sendRequest('PUT', url, {
        params: {
            receiptHandle: handle,
            visibilityTimeoutInSeconds: seconds
        }
    });
};

Subscription.prototype.list = function (options) {
    options = options || {};

    var params = u.pick(options, 'marker', 'maxRecords');

    var url = '/v1/' + this._account + '/subscription';
    return this.sendRequest('GET', url, {
        params: params
    });
};

// --- E   N   D ---

exports.Topic = Topic;
exports.Subscription = Subscription;











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
 * @file src/vod_client.js
 * @author zhouhua
 */

/* eslint-env node */
/* eslint max-params:[0,10] */
/* eslint-disable fecs-camelcase */

import u from 'underscore';

import BceBaseClient from './bce_base_client';
import BosClient from './bos_client';
import * as H from './headers';
import * as helper from './helper';

/**
 * VOD音视频点播服务
 *
 * @see https://bce.baidu.com/doc/VOD/API.html#API.E6.8E.A5.E5.8F.A3
 * @constructor
 * @param {Object} config The VodClient configuration.
 * @extends {BceBaseClient}
 */
export default class VodClient extends BceBaseClient {
    constructor(config) {
        super(config, 'vod', false);

        let {credentials, sessionToken} = this.config;
        let bosConfig = u.extend({}, this.config.bos, {
            credentials, sessionToken
        });

        this._bosClient = new BosClient(bosConfig);
        this._bosClient.on('progress', evt => this.emit('progress', evt));
    }

    createMediaResource(title, description, blob, options = {}) {
        let mediaId;
        return this._generateMediaId(options)
            .then(res => {
                mediaId = res.body.mediaId;
                let {sourceBucket, sourceKey} = res.body;
                return helper.upload(this._bosClient, sourceBucket, sourceKey, blob, options);
            })
            .then(() => this._internalCreateMediaResource(mediaId, title, description, options));
    }

    getMediaResource(mediaId, options) {
        return this.buildRequest('GET', mediaId, null, options);
    }

    listMediaResource(options) {
        return this.buildRequest('GET', null, null, options);
    }

    listMediaResources(options) {
        return this.listMediaResource(options);
    }

    updateMediaResource(mediaId, title, description, options = {}) {
        return this.buildRequest('PUT', mediaId, 'attributes', u.extend(options, {
            body: JSON.stringify({title, description})
        }));
    }

    stopMediaResource(mediaId, options) {
        return this.buildRequest('PUT', mediaId, 'disable', options);
    }

    publishMediaResource(mediaId, options) {
        return this.buildRequest('PUT', mediaId, 'publish', options);
    }

    deleteMediaResource(mediaId, options) {
        return this.buildRequest('DELETE', mediaId, null, options);
    }

    rerunMediaResource(mediaId, options) {
        return this.buildRequest('PUT', mediaId, 'rerun', options);
    }

    getPlayableUrl(mediaId, options = {}) {
        return this._buildRequest('GET', '/v1/service/file', null, null, u.extend(options, {
            params: {
                media_id: mediaId
            }
        }));
    }

    getPlayerCode(mediaId, width, height, autoStart, options = {}) {
        return this._buildRequest('GET', '/v1/service/code', null, null, u.extend(options, {
            params: {
                media_id: mediaId,
                ak: this.config.credentials.ak,
                width,
                height,
                auto_start: autoStart
            }
        }));
    }

    _generateMediaId(options) {
        return this.buildRequest('GET', 'internal', null, options);
    }

    _internalCreateMediaResource(mediaId, title, description, options = {}) {
        let params = {title};
        if (description) {
            params.description = description;
        }
        return this.buildRequest('POST', 'internal/' + mediaId, null, u.extend(options, {
            body: JSON.stringify(params)
        }));
    }

    buildRequest(verb, mediaId, query, options) {
        return this._buildRequest(verb, '/v1/media', mediaId, query, options);
    }

    _buildRequest(verb, url, mediaId, query, options) {
        let defaultArgs = {
            body: null,
            headers: {},
            params: {},
            config: {}
        };
        options = u.extend(defaultArgs, options);
        if (mediaId) {
            url += '/' + mediaId;
        }
        if (query) {
            options.params[query] = '';
        }
        if (!options.headers.hasOwnProperty(H.CONTENT_TYPE)) {
            options.headers[H.CONTENT_TYPE] = 'application/json';
        }
        return this.sendRequest(verb, url, options);
    }
}

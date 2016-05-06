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
 * @file src/bce_base_client.js
 * @author leeight
 */

/* eslint-env node */

import util from 'util';
import {EventEmitter} from 'events';

import Q from 'q';
import u from 'underscore';

import config from './config';
import Auth from './auth';
import HttpClient from './http_client';
import * as H from './headers';

export default class BceBaseClient extends EventEmitter {
    constructor(clientConfig, serviceId, regionSupported) {
        super();
        this.config = u.extend({}, config.DEFAULT_CONFIG, clientConfig);
        this.serviceId = serviceId;
        this.regionSupported = !!regionSupported;
        this.config.endpoint = this._computeEndpoint();
        this._httpAgent = null;
    }

    _computeEndpoint() {
        if (this.config.endpoint) {
            return this.config.endpoint;
        }

        if (this.regionSupported) {
            return util.format('%s://%s.%s.%s',
                this.config.protocol,
                this.serviceId,
                this.config.region,
                config.DEFAULT_SERVICE_DOMAIN);
        }
        return util.format('%s://%s.%s',
            this.config.protocol,
            this.serviceId,
            config.DEFAULT_SERVICE_DOMAIN);
    }

    createSignature(credentials, httpMethod, path, params, headers) {
        return Q.fcall(() => {
            let auth = new Auth(credentials.ak, credentials.sk);
            return auth.generateAuthorization(httpMethod, path, params, headers);
        });
    }

    sendRequest(httpMethod, resource, varArgs) {
        let defaultArgs = {
            body: null,
            headers: {},
            params: {},
            config: {},
            outputStream: null
        };
        let args = u.extend(defaultArgs, varArgs);

        let config = u.extend({}, this.config, args.config);
        if (config.sessionToken) {
            args.headers[H.SESSION_TOKEN] = config.sessionToken;
        }

        return this.sendHTTPRequest(httpMethod, resource, args, config);
    }

    sendHTTPRequest(httpMethod, resource, args, config) {
        let agent = this._httpAgent = new HttpClient(config);
        u.each(['progress', 'error', 'abort'], eventName => {
            agent.on(eventName, evt => this.emit(eventName, evt));
        });

        return this._httpAgent.sendRequest(httpMethod, resource, args.body,
            args.headers, args.params, u.bind(this.createSignature, this),
            args.outputStream
        );
    }
}

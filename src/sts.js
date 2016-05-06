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
 * @file src/sts.js
 * @author zhouhua
 */

/* eslint-env node */

import BceBaseClient from './bce_base_client';

export default class STS extends BceBaseClient {
    constructor(config) {
        super(config, 'sts', true);
    }

    getSessionToken(durationSeconds, params, options = {}) {
        let url = '/v1/sessionToken';
        let body = params != null ? JSON.stringify(params) : '';

        return this.sendRequest('POST', url, {
            config: options.config,
            params: {
                durationSeconds
            },
            body
        });
    }
}

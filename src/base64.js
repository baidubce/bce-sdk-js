/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/base64.js
 * @author lurunze
 */

function getEnv() {
    if (typeof global !== 'undefined') {
      return 'Node.js';
    } else if (typeof window !== 'undefined') {
      return 'Browser';
    } else {
      return 'Unknown environment';
    }
}

exports.urlEncode = function urlEncode(inputStr) {
    const env = getEnv();
    let base64Str = inputStr && typeof inputStr ==='string'? inputStr : JSON.stringify(inputStr);

    if (env === 'Node.js') {
        const buffer = Buffer.from(base64Str, 'utf8');
        base64Str = buffer.toString('base64');
    }
    else if (env === 'Browser') {
        base64Str = window.btoa(base64Str);
    }

    return base64Str
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

exports.urlDecode = function urlDecode(inputStr) {
    const env = getEnv();
    let result = (inputStr && typeof inputStr === 'string' ? inputStr : '').replace(/\-/g, '+').replace(/\_/g, '/');

    if (env === 'Node.js') {
        result = Buffer.from(result, 'base64').toString('utf-8');
    }
    else if (env === 'Browser') {
        result = window.atob(str);
    }

    return result;
}

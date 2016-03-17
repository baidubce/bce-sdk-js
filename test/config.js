/*
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
 */

module.exports = {
    'bos': {
        // 'endpoint': 'http://10.105.97.15',
        'endpoint': process.env.BOS_ENDPOINT,
        'credentials': {
            'ak': process.env.BOS_AK,
            'sk': process.env.BOS_SK,
        },
        'connection_timeout_in_mills': 5000,    // 5 seconds
        'account': {
            'id': '04e0d2c9e8ef478c951b97714c092f77',
            'displayName': 'PASSPORT:105016607'
        }
    },
    'bcc': {
        'endpoint': 'http://bcc.bce-api.baidu.com',
        'credentials': {
            'ak': process.env.BCC_AK,
            'sk': process.env.BCC_SK
        }
    },
    'bcs': {
        'endpoint': 'https://bs.baidu.com',
        'credentials': {
            'ak': process.env.BCS_AK,
            'sk': process.env.BCS_SK
        }
    },
    'face': {
        // 'endpoint': 'http://face.bj.baidubce.com',
        // 'endpoint': 'http://nmg02-bce-test15.nmg02.baidu.com:8750',
        'endpoint': process.env.FACE_ENDPOINT,
        'credentials': {
            'ak': process.env.FACE_AK,
            'sk': process.env.FACE_SK
        }
    },
    'ses': {
        'endpoint': process.env.SES_ENDPOINT,
        'credentials': {
            'ak': process.env.SES_AK,
            'sk': process.env.SES_SK
        }
    },
    'qns': {
        'endpoint': process.env.QNS_ENDPOINT,
        'credentials': {
            'ak': process.env.QNS_AK,
            'sk': process.env.QNS_SK
        }
    },
    'ocr': {
        'endpoint': 'http://ocr.bj.baidubce.com',
        'credentials': {
            'ak': process.env.OCR_AK,
            'sk': process.env.OCR_SK
        }
    },
    'media': {
        // 'endpoint': 'http://multimedia.bce-testinternal.baidu.com',
        'endpoint': process.env.MEDIA_ENDPOINT,
        'credentials': {
            'ak': process.env.MEDIA_AK,
            'sk': process.env.MEDIA_SK
        }
    },
    'media_bos': {
        // 'endpoint': 'http://multimedia.bce-testinternal.baidu.com',
        'endpoint': process.env.BOS_ENDPOINT,
        'credentials': {
            'ak': process.env.MEDIA_AK,
            'sk': process.env.MEDIA_SK
        }
    },
    'sts': {
        // 'endpoint': 'http://multimedia.bce-testinternal.baidu.com',
        'region': 'bj',
        'protocol': 'http',
        'credentials': {
            'ak': process.env.STS_AK,
            'sk': process.env.STS_SK
        }
    }
    // 'endpoint': 'http://localhost:8828',
};

/* vim: set ts=4 sw=4 sts=4 tw=120: */

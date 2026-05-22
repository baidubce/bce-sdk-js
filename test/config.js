/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */

module.exports = {
    bos: {
        // 'endpoint': 'http://10.105.97.15',
        endpoint: process.env.BOS_ENDPOINT,
        credentials: {
            ak: process.env.BOS_AK,
            sk: process.env.BOS_SK
        }
        // 'account': {
        //     'id': process.env.ONLINE_USER_ID || '04e0d2c9e8ef478c951b97714c092f77',
        //     'displayName': process.env.ONLINE_USER_NAME || 'PASSPORT:105016607'
        // }
    },
    bos_qa: {
        endpoint: process.env.BOS_ENDPOINT,
        credentials: {
            ak: process.env.BOS_QA_AK,
            sk: process.env.BOS_QA_SK
        }
    },
    bcc: {
        endpoint: 'http://bcc.bce-api.baidu.com',
        credentials: {
            ak: process.env.BCC_AK,
            sk: process.env.BCC_SK
        }
    },
    bcs: {
        endpoint: 'https://bs.baidu.com',
        credentials: {
            ak: process.env.BCS_AK,
            sk: process.env.BCS_SK
        }
    },
    face: {
        endpoint: process.env.FACE_ENDPOINT,
        credentials: {
            ak: process.env.FACE_AK,
            sk: process.env.FACE_SK
        }
    },
    ses: {
        endpoint: process.env.SES_ENDPOINT,
        credentials: {
            ak: process.env.SES_AK,
            sk: process.env.SES_SK
        }
    },
    qns: {
        endpoint: process.env.QNS_ENDPOINT,
        credentials: {
            ak: process.env.QNS_AK,
            sk: process.env.QNS_SK
        }
    },
    ocr: {
        endpoint: process.env.OCR_ENDPOINT,
        credentials: {
            ak: process.env.OCR_AK,
            sk: process.env.OCR_SK
        }
    },
    lss: {
        endpoint: process.env.LSS_ENDPOINT,
        credentials: {
            ak: process.env.LSS_AK,
            sk: process.env.LSS_SK
        }
    },
    media: {
        // 'endpoint': 'http://multimedia.bce-testinternal.baidu.com',
        endpoint: process.env.MEDIA_ENDPOINT,
        credentials: {
            ak: process.env.MEDIA_AK,
            sk: process.env.MEDIA_SK
        }
    },
    vod: {
        endpoint: process.env.VOD_ENDPOINT,
        credentials: {
            ak: process.env.VOD_AK,
            sk: process.env.VOD_SK
        }
    },
    doc: {
        endpoint: process.env.DOC_ENDPOINT,
        credentials: {
            ak: process.env.DOC_AK,
            sk: process.env.DOC_SK
        }
    },
    sts: {
        endpoint: process.env.STS_ENDPOINT,
        credentials: {
            ak: process.env.STS_AK,
            sk: process.env.STS_SK
        }
    },
    tsdbData: {
        endpoint: process.env.TSDB_DATA_ENDPOINT,
        credentials: {
            ak: process.env.TSDB_AK,
            sk: process.env.TSDB_SK
        }
    },
    tsdbAdmin: {
        endpoint: process.env.TSDB_ADMIN_ENDPOINT,
        credentials: {
            ak: process.env.TSDB_AK,
            sk: process.env.TSDB_SK
        }
    },
    cfc: {
        endpoint: 'http://cfc.bj.baidubce.com',
        credentials: {
            ak: process.env.CFC_AK,
            sk: process.env.CFC_SK
        }
    },
    bts: {
        endpoint: 'http://bts.gz.baidubce.com',
        credentials: {
            ak: process.env.BTS_AK,
            sk: process.env.BTS_SK
        }
    }
};

/* vim: set ts=4 sw=4 sts=4 tw=120: */

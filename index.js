/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file index.js
 * @author leeight,mudio
 */

exports.Q = require('q');

exports.version = require('./package.json').version;
exports.crypto = require('./src/crypto');
exports.strings = require('./src/strings');
exports.STS = require('./src/sts');
exports.Auth = require('./src/auth');
exports.MimeType = require('./src/mime.types');
exports.Base64 = require('./src/base64');

exports.HttpClient = require('./src/http_client');
exports.BceBaseClient  = require('./src/bce_base_client');

exports.BosClient = require('./src/bos_client');
exports.BcsClient = require('./src/bcs_client');
exports.BccClient = require('./src/bcc_client');
exports.SesClient = require('./src/ses_client');
exports.QnsClient = require('./src/qns_client');
exports.LssClient = require('./src/lss_client');
exports.MctClient = require('./src/mct_client');
exports.FaceClient = require('./src/face_client');
exports.OCRClient = require('./src/ocr_client');
exports.MediaClient = require('./src/media_client');
exports.VodClient = require('./src/vod_client');
exports.DocClient = require('./src/doc_client');
exports.TsdbDataClient = require('./src/tsdb_data_client');
exports.TsdbAdminClient = require('./src/tsdb_admin_client');
exports.CfcClient = require('./src/cfc_client');
exports.BtsClient = require('./src/bts_client');
exports.IoTClient = require('./src/iot_client');

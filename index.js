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
 * @file index.js
 * @author leeight,mudio
 */

exports.Q = require('q');

exports.version = require('./package.json').version;
exports.STS = require('./src/sts');
exports.Auth = require('./src/auth');
exports.MimeType = require('./src/mime.types');

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











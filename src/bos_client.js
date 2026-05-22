// @ts-check
/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file src/bos_client.js
 * @author leeight
 */

/* eslint-env node */
/* eslint max-params:[0,10] */

var util = require('util');
var path = require('path');
var fs = require('fs');
var qs = require('querystring');

var u = require('underscore');
var Q = require('q');

var H = require('./headers');
var strings = require('./strings');
var Auth = require('./auth');
var crypto = require('./crypto');
var HttpClient = /** @type {typeof BaiduBCE.HttpClient} */ (/** @type {unknown} */ (require('./http_client')));
var BceBaseClient = require('./bce_base_client');
var MimeType = require('./mime.types');
var WMStream = require('./wm_stream');
var stream = require('stream');
var Multipart = require('./multipart');
var Base64 = require('./base64');
var {domainUtils, applyTrafficLimit} = require('./helper');
var debug = require('debug')('bce-sdk:BosClient');
var SuperUpload = require('./bos/super_upload');

// var MIN_PART_SIZE = 1048576;                // 1M
// var THREAD = 2;
var MAX_PUT_OBJECT_LENGTH = 5368709120; // 5G
var MAX_USER_METADATA_SIZE = 2048; // 2 * 1024
var MIN_PART_NUMBER = 1;
var MAX_PART_NUMBER = 10000;
var MAX_RETRY_COUNT = 3;
var COMMAND_MAP = {
  scale: 's',
  width: 'w',
  height: 'h',
  quality: 'q',
  format: 'f',
  angle: 'a',
  display: 'd',
  limit: 'l',
  crop: 'c',
  offsetX: 'x',
  offsetY: 'y',
  watermark: 'wm',
  key: 'k',
  gravity: 'g',
  gravityX: 'x',
  gravityY: 'y',
  opacity: 'o',
  text: 't',
  fontSize: 'sz',
  fontFamily: 'ff',
  fontColor: 'fc',
  fontStyle: 'fs'
};
var IMAGE_DOMAIN = 'bceimg.com';

/**
 * 类型定义统一来自 `types/bos-client.d.ts`，作为单一数据源（SSOT）。
 *
 * —— Common ——
 * @typedef {import('../types').BosClient} IBosClient
 * @typedef {import('../types').BceClientOptions}     BceClientOptions
 * @typedef {import('../types').BosClientOptions}     BosClientOptions
 * @typedef {import('../types').BosRequestConfig}     BosRequestConfig
 * @typedef {import('../types').BosRequestArgs}       BosRequestArgs
 * @typedef {import('../types').HttpMethod}           HttpMethod
 * @typedef {import('../types').BosClientAPIOptions}  BosClientAPIOptions
 * @typedef {import('../types').BosClientOptions & import('../types').BosRequestConfig} HTTPRequestConfig
 * @typedef {import('../types').BOSCannedACLType}     BOSCannedACLType
 * @typedef {import('../types').BOSObjectCannedACLType} BOSObjectCannedACLType
 * @typedef {import('../types').BOSStorageClassType}  BOSStorageClassType
 * @typedef {import('../types').BucketVersionStateType} BucketVersionStateType
 *
 * —— Service ——
 * @typedef {import('../types').PutUserQuotaReq}      PutUserQuotaReq
 * @typedef {import('../types').GetUserQuotaRes}      GetUserQuotaRes
 * @typedef {import('../types').ListBucketsRes}       ListBucketsRes
 *
 * —— Bucket ——
 * @typedef {import('../types').GetBucketLocationRes} GetBucketLocationRes
 * @typedef {import('../types').GetBucketStorageclassRes} GetBucketStorageclassRes
 * @typedef {import('../types').HeadBucketHeaders}    HeadBucketHeaders
 * @typedef {import('../types').GetBucketAclRes}      GetBucketAclRes
 * @typedef {import('../types').PutBucketLifecycleReq} PutBucketLifecycleReq
 * @typedef {import('../types').GetBucketLifecycleRes} GetBucketLifecycleRes
 * @typedef {import('../types').PutBucketLoggingReq}  PutBucketLoggingReq
 * @typedef {import('../types').GetBucketLoggingRes}  GetBucketLoggingRes
 * @typedef {import('../types').PutBucketStaticWebsiteReq} PutBucketStaticWebsiteReq
 * @typedef {import('../types').GetBucketStaticWebsiteRes} GetBucketStaticWebsiteRes
 * @typedef {import('../types').GetBucketEncryptionRes} GetBucketEncryptionRes
 * @typedef {import('../types').PutBucketReplicationReq} PutBucketReplicationReq
 * @typedef {import('../types').GetBucketReplicationRes} GetBucketReplicationRes
 * @typedef {import('../types').InitBucketObjectLockReq} InitBucketObjectLockReq
 * @typedef {import('../types').ExtendBucketObjectLockReq} ExtendBucketObjectLockReq
 * @typedef {import('../types').GetBucketObjectLockRes} GetBucketObjectLockRes
 * @typedef {import('../types').GetBucketVersioningRes} GetBucketVersioningRes
 *
 * —— Object ——
 * @typedef {import('../types').ListObjectOptions}    ListObjectOptions
 * @typedef {import('../types').ListObjectsRes}       ListObjectsRes
 * @typedef {import('../types').ListObjectVersionsRes} ListObjectVersionsRes
 * @typedef {import('../types').PutObjectResHeaders}  PutObjectResHeaders
 * @typedef {import('../types').CopyObjectRes}        CopyObjectRes
 * @typedef {import('../types').CopyObjectHeaders}    CopyObjectHeaders
 * @typedef {import('../types').GetObjectMetaHeaders} GetObjectMetaHeaders
 * @typedef {import('../types').DeleteMultipleObjectsRes} DeleteMultipleObjectsRes
 * @typedef {import('../types').SelectObjectReq}      SelectObjectReq
 * @typedef {import('../types').GetObjectAclRes}      GetObjectAclRes
 *
 * —— Multipart ——
 * @typedef {import('../types').InitiateMultipartUploadRes} InitiateMultipartUploadRes
 * @typedef {import('../types').CompletePart}         CompletePart
 * @typedef {import('../types').CompleteMultipartUploadRes} CompleteMultipartUploadRes
 * @typedef {import('../types').CompleteMultipartUploadHeaders} CompleteMultipartUploadHeaders
 * @typedef {import('../types').ListPartsOptions}     ListPartsOptions
 * @typedef {import('../types').ListPartsRes}         ListPartsRes
 * @typedef {import('../types').ListMultipartUploadsRes} ListMultipartUploadsRes
 *
 * —— Misc ——
 * @typedef {import('../types').CreateFolderShareUrlReq} CreateFolderShareUrlReq
 * @typedef {import('../types').CreateFolderShareUrlRes} CreateFolderShareUrlRes
 * @typedef {import('../types').PutSuperObjectReq}    PutSuperObjectReq
 */

/**
 * BOS service api
 *
 * @see http://gollum.baidu.com/BOS_API#BOS-API文档
 * @doc https://cloud.baidu.com/doc/BOS/s/Rjwvysdnp
 *
 * @constructor
 * @param {BceClientOptions} config The bos client configuration.
 */

function BosClient(config) {
  BceBaseClient.call(this, config, 'bos', true);

  /**
   * @type {HttpClient | null}
   */
  this._httpAgent = null;
}
util.inherits(BosClient, BceBaseClient);

// --- B E G I N ---

/** ***********************************************************************************
 *                                  Service相关接口
 ************************************************************************************ */

/** @type {IBosClient['putUserQuota']} */
BosClient.prototype.putUserQuota = function (body, options) {
  options = options || {};
  body = u.pick(body || {}, ['maxBucketCount', 'maxCapacityMegaBytes']);

  if (body.maxBucketCount == null || body.maxCapacityMegaBytes == null) {
    throw new TypeError('maxBucketCount or maxCapacityMegaBytes should not be empty.');
  }

  if (typeof body.maxBucketCount !== 'number' || typeof body.maxCapacityMegaBytes !== 'number') {
    throw new TypeError('maxBucketCount or maxCapacityMegaBytes should not be number.');
  }

  return this.sendRequest('PUT', {
    params: {userQuota: ''},
    body: JSON.stringify(body),
    config: options.config
  });
};

/** @type {IBosClient['getUserQuota']} */
BosClient.prototype.getUserQuota = function (options) {
  options = options || {};

  return this.sendRequest('GET', {
    params: {userQuota: ''},
    config: options.config
  });
};

/** @type {IBosClient['deleteUserQuota']} */
BosClient.prototype.deleteUserQuota = function (options) {
  options = options || {};

  return this.sendRequest('DELETE', {
    params: {userQuota: ''},
    config: options.config
  });
};

/** @type {IBosClient['listBuckets']} */
BosClient.prototype.listBuckets = function (options) {
  options = options || {};
  return this.sendRequest('GET', {config: options.config});
};

/** ***********************************************************************************
 *                                  Bucket基础操作
 ************************************************************************************ */

/** @type {IBosClient['getBucketLocation']} */
BosClient.prototype.getBucketLocation = function (bucketName, options) {
  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {location: ''},
    config: options.config
  });
};

/** @type {IBosClient['putBucket']} */
BosClient.prototype.putBucket = BosClient.prototype.createBucket = function (bucketName, options) {
  options = options || {};

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    body: JSON.stringify({
      enableMultiAZ: !!(options.body && options.body.enableMultiAZ)
    }),
    config: options.config
  });
};

/** @type {IBosClient['headBucket']} */
BosClient.prototype.headBucket = BosClient.prototype.doesBucketExist = function (bucketName, options) {
  options = options || {};

  return this.sendRequest('HEAD', {
    bucketName: bucketName,
    config: options.config
  }).then(
    function () {
      return Q(true);
    },
    function (e) {
      if (e && e[H.X_STATUS_CODE] === 403) {
        return Q(true);
      }
      if (e && e[H.X_STATUS_CODE] === 404) {
        return Q(false);
      }
      return Q.reject(e);
    }
  );
};

/**
 * 查看 Bucket 是否存在和请求者是否有权限访问这个 Bucket，并获取 Bucket 的元信息（`headBucket` 已被占用，故另起 `_headBucket`）。
 *
 * @doc https://cloud.baidu.com/doc/BOS/s/Mkc4eqkiz
 * @param {string} bucketName
 * @param {BosClientAPIOptions} [options]
 * @returns {Promise<{http_headers: HeadBucketHeaders, body: any}>}
 */
BosClient.prototype._headBucket = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('HEAD', {
    bucketName: bucketName,
    config: options.config
  });
};

/** @type {IBosClient['deleteBucket']} */
BosClient.prototype.deleteBucket = function (bucketName, options) {
  options = options || {};

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    config: options.config
  });
};

/** @type {IBosClient['putBucketStorageclass']} */
BosClient.prototype.putBucketStorageclass = function (bucketName, storageClass, options) {
  options = options || {};
  /** @type {Record<string, any>} */
  var headers = {};
  headers[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    headers: headers,
    params: {storageClass: ''},
    body: JSON.stringify({storageClass: storageClass}),
    config: options.config
  });
};

/** @type {IBosClient['getBucketStorageclass']} */
BosClient.prototype.getBucketStorageclass = function (bucketName, options) {
  options = options || {};
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {storageClass: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket权限控制
 ************************************************************************************ */

/** @type {IBosClient['putBucketAcl']} */
BosClient.prototype.putBucketAcl = function (bucketName, acl, options) {
  options = options || {};

  /** @type Record<string, string> */
  var headers = {};
  headers[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
  headers[H.X_BCE_ACL] = acl;
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    headers: headers,
    params: {acl: ''},
    config: options.config
  });
};

/** @type {IBosClient['setBucketCannedAcl']} */
BosClient.prototype.setBucketCannedAcl = function (bucketName, cannedAcl, options) {
  options = options || {};

  /** @type Record<string, string> */
  var headers = {};
  headers[H.X_BCE_ACL] = cannedAcl;
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    headers: headers,
    params: {acl: ''},
    config: options.config
  });
};

/** @type {IBosClient['setBucketAcl']} */
BosClient.prototype.setBucketAcl = function (bucketName, acl, options) {
  options = options || {};

  /** @type Record<string, string> */
  var headers = {};
  headers[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    body: JSON.stringify({accessControlList: acl}),
    headers: headers,
    params: {acl: ''},
    config: options.config
  });
};

/** @type {IBosClient['getBucketAcl']} */
BosClient.prototype.getBucketAcl = function (bucketName, options) {
  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {acl: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket生命周期
 ************************************************************************************ */

/** @type {IBosClient['putBucketLifecycle']} */
BosClient.prototype.putBucketLifecycle = function (bucketName, body, options) {
  options = options || {};
  body = u.pick(body || {}, ['rule']);

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!Array.isArray(body.rule)) {
    throw new TypeError('rule should not an array.');
  }

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    params: {lifecycle: ''},
    body: JSON.stringify(body),
    config: options.config
  });
};

/** @type {IBosClient['getBucketLifecycle']} */
BosClient.prototype.getBucketLifecycle = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {lifecycle: ''},
    config: options.config
  });
};

/** @type {IBosClient['deleteBucketLifecycle']} */
BosClient.prototype.deleteBucketLifecycle = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    params: {lifecycle: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket日志管理
 ************************************************************************************ */

/** @type {IBosClient['putBucketLogging']} */
BosClient.prototype.putBucketLogging = function (bucketName, body, options) {
  options = options || {};
  body = u.pick(body || {}, ['targetBucket', 'targetPrefix']);

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (body.targetPrefix && typeof body.targetPrefix !== 'string') {
    throw new TypeError('targetPrefix should be a string.');
  }

  if (!body.targetBucket) {
    body.targetBucket = bucketName;
  }

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    params: {logging: ''},
    body: JSON.stringify(body),
    config: options.config
  });
};

/** @type {IBosClient['getBucketLogging']} */
BosClient.prototype.getBucketLogging = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {logging: ''},
    config: options.config
  });
};

/** @type {IBosClient['deleteBucketLogging']} */
BosClient.prototype.deleteBucketLogging = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    params: {logging: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket静态网站
 ************************************************************************************ */

/** @type {IBosClient['putBucketStaticWebsite']} */
BosClient.prototype.putBucketStaticWebsite = function (bucketName, body, options) {
  options = options || {};
  body = u.pick(body || {}, ['index', 'notFound']);

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (body.index && typeof body.index !== 'string') {
    throw new TypeError('field "index" should be a string.');
  }

  if (body.notFound && typeof body.notFound !== 'string') {
    throw new TypeError('field "notFound" should be a string.');
  }

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    params: {website: ''},
    body: JSON.stringify(body),
    config: options.config
  });
};

/** @type {IBosClient['getBucketStaticWebsite']} */
BosClient.prototype.getBucketStaticWebsite = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {website: ''},
    config: options.config
  });
};

/** @type {IBosClient['deleteBucketStaticWebsite']} */
BosClient.prototype.deleteBucketStaticWebsite = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    params: {website: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket数据加密
 ************************************************************************************ */

/** @type {IBosClient['putBucketEncryption']} */
BosClient.prototype.putBucketEncryption = function (bucketName, body, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  body = u.pick(body || {}, ['encryptionAlgorithm']);

  if (!body.encryptionAlgorithm) {
    throw new TypeError('encryptionAlgorithm should not be empty.');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    params: {encryption: ''},
    body: JSON.stringify(body),
    headers: options.headers,
    config: options.config
  });
};

/** @type {IBosClient['getBucketEncryption']} */
BosClient.prototype.getBucketEncryption = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {encryption: ''},
    config: options.config
  });
};

/** @type {IBosClient['deleteBucketEncryption']} */
BosClient.prototype.deleteBucketEncryption = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = options || {};

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    params: {encryption: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket数据同步
 ************************************************************************************ */

/** @type {IBosClient['putBucketReplication']} */
BosClient.prototype.putBucketReplication = function (bucketName, body, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = options || {};
  body = u.pick(body || {}, ['status', 'resource', 'destination', 'replicateHistory', 'replicateDeletes', 'id']);

  if (!body.id || !body.status || !body.resource || !body.destination || !body.replicateDeletes) {
    throw new TypeError(
      'field "id", "status", "resource", "destination", "replicateHistory", "replicateDeletes" should not be empty.'
    );
  }

  if (!body.destination.bucket) {
    throw new TypeError('target bucket name should not be empty.');
  }

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    params: {replication: '', id: body.id},
    body: JSON.stringify(body),
    config: options.config
  });
};

/** @type {IBosClient['getBucketReplication']} */
BosClient.prototype.getBucketReplication = function (bucketName, id, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (id) {
    throw new TypeError('replication id should not be empty.');
  }

  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {replication: '', id},
    config: options.config
  });
};

/** @type {IBosClient['deleteBucketReplication']} */
BosClient.prototype.deleteBucketReplication = function (bucketName, id, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (id) {
    throw new TypeError('replication id should not be empty.');
  }

  options = options || {};

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    params: {replication: '', id},
    config: options.config
  });
};

/** @type {IBosClient['getBucketReplicationProgress']} */
BosClient.prototype.getBucketReplicationProgress = function (bucketName, id, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (id) {
    throw new TypeError('replication id should not be empty.');
  }

  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {replicationProgress: '', id},
    config: options.config
  });
};

/** @type {IBosClient['listBucketReplication']} */
BosClient.prototype.listBucketReplication = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {replication: '', list: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Bucket合规保留
 ************************************************************************************ */

/** @type {IBosClient['initBucketObjectLock']} */
BosClient.prototype.initBucketObjectLock = function (bucketName, body, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = this._checkOptions(options || {});
  body = u.pick(body || {}, ['retentionDays']);

  if (!body.retentionDays) {
    throw new TypeError('retentionDays should not be empty.');
  }

  return this.sendRequest('POST', {
    bucketName: bucketName,
    params: {objectlock: ''},
    body: JSON.stringify(body),
    config: options.config,
    headers: options.headers
  });
};

/** @type {IBosClient['getBucketObjectLock']} */
BosClient.prototype.getBucketObjectLock = function (bucketName, options) {
  options = options || {};

  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {objectlock: ''},
    config: options.config,
    headers: options.headers
  });
};

/** @type {IBosClient['deleteBucketObjectLock']} */
BosClient.prototype.deleteBucketObjectLock = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    params: {objectlock: ''},
    config: options.config,
    headers: options.headers
  });
};

/** @type {IBosClient['completeBucketObjectLock']} */
BosClient.prototype.completeBucketObjectLock = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('POST', {
    bucketName: bucketName,
    params: {completeobjectlock: ''},
    config: options.config,
    headers: options.headers
  });
};

/** @type {IBosClient['extendBucketObjectLock']} */
BosClient.prototype.extendBucketObjectLock = function (bucketName, body, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = this._checkOptions(options || {});
  body = u.pick(body || {}, ['extendRetentionDays']);

  if (!body.extendRetentionDays) {
    throw new TypeError('extendRetentionDays should not be empty.');
  }

  return this.sendRequest('POST', {
    bucketName: bucketName,
    params: {extendobjectlock: ''},
    body: JSON.stringify(body),
    config: options.config,
    headers: options.headers
  });
};

/** ***********************************************************************************
 *                                  Bucket版本控制
 ************************************************************************************ */

/** @type {IBosClient['putBucketVersioning']} */
BosClient.prototype.putBucketVersioning = function (bucketName, status, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!status) {
    throw new TypeError('status should not be empty.');
  }

  if (!['enabled', 'notEnabled', 'suspended'].includes(status)) {
    throw new TypeError('status should be one of "enabled", "notEnabled", "suspended"');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    params: {versioning: ''},
    body: JSON.stringify({status: status}),
    config: options.config,
    headers: options.headers
  });
};

/** @type {IBosClient['getBucketVersioning']} */
BosClient.prototype.getBucketVersioning = function (bucketName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: {versioning: ''},
    config: options.config,
    headers: options.headers
  });
};

/** ***********************************************************************************
 *                                  Object基础操作
 ************************************************************************************ */

/** @type {IBosClient['listObjects']} */
BosClient.prototype.listObjects = function (bucketName, options) {
  options = options || {};
  var params = u.extend({maxKeys: 1000}, u.pick(options, 'maxKeys', 'prefix', 'marker', 'delimiter'));

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: params,
    config: options.config
  });
};

/** @type {IBosClient['putObject']} */
BosClient.prototype.putObject = function (bucketName, key, data, options) {
  if (!key) {
    throw new TypeError('key should not be empty.');
  }

  options = this._checkOptions(options || {});

  return this.sendRequest('PUT', {
    bucketName: bucketName,
    key: key,
    body: data,
    headers: options.headers,
    config: options.config
  });
};

/** @type {IBosClient['putObjectFromString']} */
BosClient.prototype.putObjectFromString = function (bucketName, key, data, options) {
  options = options || {};

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_LENGTH] = Buffer.byteLength(data);
  headers[H.CONTENT_TYPE] = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(key));
  headers[H.CONTENT_MD5] = crypto.md5sum(data);
  options = u.extend(headers, options);

  return this.putObject(bucketName, key, data, options);
};

/** @type {IBosClient['putObjectFromBlob']} */
BosClient.prototype.putObjectFromBlob = function (bucketName, key, blob, options) {
  /** @type Record<string, string | number> */
  var headers = {};

  // https://developer.mozilla.org/en-US/docs/Web/API/Blob/size
  headers[H.CONTENT_LENGTH] = blob.size;
  // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
  // 而且根据 API 文档，这个字段不是必填的。
  options = u.extend(headers, options);

  return this.putObject(bucketName, key, blob, options);
};

/** @type {IBosClient['putObjectFromFile']} */
BosClient.prototype.putObjectFromFile = function (bucketName, key, filename, options) {
  options = options || {};

  /** @type Record<string, string | number> */
  var headers = {};

  // 如果没有显式的设置，就使用默认值
  var fileSize = fs.statSync(filename).size;
  var contentLength = u.has(options, H.CONTENT_LENGTH) ? options[H.CONTENT_LENGTH] : fileSize;
  if (contentLength > fileSize) {
    throw new Error("options['Content-Length'] should less than " + fileSize);
  }

  headers[H.CONTENT_LENGTH] = contentLength;

  // 因为Firefox会在发起请求的时候自动给 Content-Type 添加 charset 属性
  // 导致我们计算签名的时候使用的 Content-Type 值跟服务器收到的不一样，为了
  // 解决这个问题，我们需要显式的声明Charset
  headers[H.CONTENT_TYPE] = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(filename));
  options = u.extend(headers, options);
  /** @type {Record<string, any>} */
  var opts = options || {};

  var streamOptions = {
    start: 0,
    end: Math.max(0, contentLength - 1)
  };

  var me = this;

  /**
   * @param {number} lastRetryTimes
   * @returns {Promise<any>}
   */
  function putObjectWithRetry(lastRetryTimes) {
    return me.putObject(bucketName, key, fs.createReadStream(filename, streamOptions), opts).catch(
      /**
       * @param {any} err
       * @returns {Promise<any>}
       */
      function (err) {
        var serverTimestamp = new Date(err[H.X_BCE_DATE]).getTime();

        BceBaseClient.prototype.timeOffset = serverTimestamp - Date.now();

        if (err[H.X_STATUS_CODE] === 400 && err[H.X_CODE] === 'Http400' && lastRetryTimes > 0) {
          return putObjectWithRetry(--lastRetryTimes);
        }

        return Q.reject(err);
      }
    );
  }

  if (!u.has(opts, H.CONTENT_MD5)) {
    var fp2 = fs.createReadStream(filename, streamOptions);
    return crypto.md5stream(fp2).then(/** @param {any} md5sum */ function (md5sum) {
      opts[H.CONTENT_MD5] = md5sum;
      return putObjectWithRetry(opts.retryCount || MAX_RETRY_COUNT);
    });
  }

  return putObjectWithRetry(opts.retryCount || MAX_RETRY_COUNT);
};

/** @type {IBosClient['putObjectFromDataUrl']} */
BosClient.prototype.putObjectFromDataUrl = function (bucketName, key, data, options) {
  var buf = new Buffer(data, 'base64');

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_LENGTH] = buf.length;
  // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
  // headers[H.CONTENT_MD5] = require('./crypto').md5sum(data);
  options = u.extend(headers, options);

  return this.putObject(bucketName, key, buf, options);
};

/**
 * @type {IBosClient['postObject']}
 * @this {IBosClient}
 */
BosClient.prototype.postObject = function (bucketName, key, data, options) {
  var boundary = 'MM8964' + (Math.random() * Math.pow(2, 63)).toString(36);
  var contentType = 'multipart/form-data; boundary=' + boundary;

  if (u.isString(data)) {
    data = fs.readFileSync(data);
  } else if (!Buffer.isBuffer(data)) {
    throw new Error('Invalid data type.');
  }

  var credentials = this.config.credentials;
  var ak = credentials.ak;

  var blacklist = ['signature', 'accessKey', 'key', 'file'];
  /** @type {Record<string, any>} */
  var opts = u.omit(options || {}, blacklist) || {};

  var multipart = new Multipart(boundary);
  for (var k in opts) {
    if (opts.hasOwnProperty(k)) {
      if (k !== 'policy') {
        multipart.addPart(k, opts[k]);
      }
    }
  }

  if (opts.policy) {
    var rv = this.signPostObjectPolicy(opts.policy);
    multipart.addPart('policy', rv.policy);
    multipart.addPart('signature', rv.signature);
  }

  multipart.addPart('accessKey', ak);
  multipart.addPart('key', key);
  multipart.addPart('file', data);

  var body = multipart.encode();
  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_TYPE] = contentType;

  applyTrafficLimit(opts, headers);

  return this.sendRequest('POST', {
    bucketName: bucketName,
    body: body,
    headers: headers
  });
};

/** @type {IBosClient['copyObject']} */
BosClient.prototype.copyObject = function (sourceBucketName, sourceKey, targetBucketName, targetKey, options) {
  if (!sourceBucketName) {
    throw new TypeError('sourceBucketName should not be empty');
  }
  if (!sourceKey) {
    throw new TypeError('sourceKey should not be empty');
  }
  if (!targetBucketName) {
    throw new TypeError('targetBucketName should not be empty');
  }
  if (!targetKey) {
    throw new TypeError('targetKey should not be empty');
  }

  var opts = this._checkOptions(options || {});
  var hasUserMetadata = false;
  u.some(opts.headers, /** @param {any} value @param {any} key */ function (value, key) {
    if (key.indexOf('x-bce-meta-') === 0) {
      hasUserMetadata = true;
      return true;
    }
  });

  var versionId = (options || {}).versionId;
  /** 源Object地址 */
  opts.headers['x-bce-copy-source'] = strings.normalize(util.format('/%s/%s', sourceBucketName, sourceKey), false);
  /** 如果指定了versionId参数，则将versionId拼接到copy-source参数中 */
  if (versionId) {
    opts.headers['x-bce-copy-source'] += `?versionId=${versionId}`;
  }

  if (u.has(opts.headers, 'ETag')) {
    opts.headers['x-bce-copy-source-if-match'] = opts.headers.ETag;
  }
  opts.headers['x-bce-metadata-directive'] = hasUserMetadata ? 'replace' : 'copy';

  return this.sendRequest('PUT', {
    bucketName: targetBucketName,
    key: targetKey,
    headers: opts.headers,
    config: opts.config
  });
};

/** @type {IBosClient['getObject']} */
BosClient.prototype.getObject = function (bucketName, key, range, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!key) {
    throw new TypeError('key should not be empty.');
  }

  options = options || {};

  var headers = {};
  applyTrafficLimit(options, headers);

  var outputStream = new WMStream();
  /** @type {{bucketName: string, key: string, headers: Record<string, any>, config: any, outputStream: any, params?: Record<string, any>}} */
  const reqArgs = {
    bucketName: bucketName,
    key: key,
    headers: u.extend(
      {
        Range: range ? util.format('bytes=%s', range) : ''
      },
      headers
    ),
    config: options.config,
    outputStream: outputStream
  };

  /** 多版本文件的版本ID */
  if (options.versionId && typeof options.versionId === 'string') {
    reqArgs.params = {
      versionId: options.versionId
    };
  }

  return this.sendRequest('GET', reqArgs).then(function (response) {
    response.body = Buffer.concat(outputStream.store);
    return response;
  });
};

/** @type {IBosClient['getObjectToFile']} */
BosClient.prototype.getObjectToFile = function (bucketName, key, filename, range, options) {
  if (!key) {
    throw new TypeError('key should not be empty.');
  } else if (/\/\/+/.test(key)) {
    throw new TypeError('key should not contain consecutive forward slashes (/).');
  } else if (/^[/\\]/.test(key) || /[/\\]$/.test(key)) {
    throw new TypeError('key should not start or end with a forward slash (/) or a backslash (\\).');
  } else if (/\/\.\.\//.test(key)) {
    throw new TypeError('path in key should not contain consecutive periods (..).');
  }

  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    key: key,
    headers: {
      Range: range ? util.format('bytes=%s', range) : ''
    },
    config: options.config,
    outputStream: fs.createWriteStream(filename)
  });
};

/** @type {IBosClient['getObjectMetadata']} */
BosClient.prototype.getObjectMetadata = function (bucketName, key, options) {
  options = options || {};

  /** @type {{bucketName: string, key: string, config: any, params?: Record<string, any>}} */
  const reqArgs = {
    bucketName: bucketName,
    key: key,
    config: options.config
  };

  /** 多版本文件的版本ID */
  if (options.versionId && typeof options.versionId === 'string') {
    reqArgs.params = {
      versionId: options.versionId
    };
  }

  return this.sendRequest('HEAD', reqArgs);
};

/** @type {IBosClient['restoreObject']} */
BosClient.prototype.restoreObject = function (bucketName, objectName, options) {
  if (!objectName) {
    throw new TypeError('objectName should not be empty.');
  }

  var opts = this._checkOptions(options || {});
  var headers = opts.headers;

  if (headers.hasOwnProperty(H.X_BCE_RESTORE_DAYS)) {
    const restoreDays = headers[H.X_BCE_RESTORE_DAYS];

    if (!u.isNumber(restoreDays) || restoreDays < 0 || restoreDays > 30) {
      throw new TypeError('x-bce-restore-days should be an integer with range of 0 ~ 30');
    }
  }

  if (headers.hasOwnProperty(H.X_BCE_RESTORE_TIER)) {
    const restoreTier = headers[H.X_BCE_RESTORE_TIER];
    const restoreTierEnum = ['Expedited', 'Standard', 'LowCost'];

    if (!~restoreTierEnum.indexOf(restoreTier)) {
      throw new TypeError('x-bce-restore-tier should be ' + restoreTierEnum.join(', '));
    }
  }

  return this.sendRequest('POST', {
    bucketName,
    key: objectName,
    params: {restore: ''},
    headers: opts.headers,
    config: opts.config
  });
};

/** @type {IBosClient['fetchObject']} */
BosClient.prototype.fetchObject = function (bucketName, objectName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!objectName) {
    throw new TypeError('objectName should not be empty.');
  }

  var opts = this._checkOptions(options || {}, [H.X_BCE_FETCH_SOURCE]);
  var headers = opts.headers;

  if (!headers[H.X_BCE_FETCH_SOURCE]) {
    throw new TypeError('x-bce-fetch-source should not be empty, at least in query string or headers.');
  }

  return this.sendRequest('POST', {
    bucketName,
    key: objectName,
    params: u.extend({fetch: ''}, qs.encode(opts.params)),
    headers: headers,
    config: opts.config
  });
};

/** @type {IBosClient['deleteObject']} */
BosClient.prototype.deleteObject = function (bucketName, key, options) {
  options = options || {};

  /** @type {{bucketName: string, key: string, config: any, params?: Record<string, any>}} */
  const reqArgs = {
    bucketName: bucketName,
    key: key,
    config: options.config
  };

  if (options.versionId && typeof options.versionId === 'string') {
    reqArgs.params = {
      versionId: options.versionId
    };
  }

  return this.sendRequest('DELETE', reqArgs);
};

/** @type {IBosClient['deleteMultipleObjects']} */
BosClient.prototype.deleteMultipleObjects = function (bucketName, objects, options) {
  options = options || {};

  const body = objects
    .map((file) => {
      if (typeof file === 'string') {
        return {key: file};
      } else if (typeof file === 'object') {
        /** @type {{key: string, versionId?: string}} */
        const fileObject = {key: file.key};

        if (file.versionId && typeof file.versionId === 'string') {
          fileObject.versionId = file.versionId;
        }
        return fileObject;
      } else {
        return null;
      }
    })
    .filter((file) => file != null);

  return this.sendRequest('POST', {
    bucketName: bucketName,
    params: {delete: ''},
    body: JSON.stringify({
      objects: body
    }),
    config: options.config
  });
};

/** @type {IBosClient['appendObject']} */
BosClient.prototype.appendObject = function (bucketName, key, data, offset, options) {
  if (!key) {
    throw new TypeError('key should not be empty.');
  }

  options = this._checkOptions(options || {});
  /** @type {Record<string, any>} */
  var params = {append: ''};
  if (u.isNumber(offset)) {
    params.offset = offset;
  }
  return this.sendRequest('POST', {
    bucketName: bucketName,
    key: key,
    body: data,
    headers: options.headers,
    params: params,
    config: options.config
  });
};

/** @type {IBosClient['appendObjectFromString']} */
BosClient.prototype.appendObjectFromString = function (bucketName, key, data, offset, options) {
  options = options || {};

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_LENGTH] = Buffer.byteLength(data);
  headers[H.CONTENT_TYPE] = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(key));
  headers[H.CONTENT_MD5] = crypto.md5sum(data);
  options = u.extend(headers, options);

  return this.appendObject(bucketName, key, data, offset, options);
};

/** @type {IBosClient['appendObjectFromBlob']} */
BosClient.prototype.appendObjectFromBlob = function (bucketName, key, blob, offset, options) {
  /** @type Record<string, string | number> */
  var headers = {};

  // https://developer.mozilla.org/en-US/docs/Web/API/Blob/size
  headers[H.CONTENT_LENGTH] = blob.size;
  // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
  // 而且根据 API 文档，这个字段不是必填的。
  options = u.extend(headers, options);

  return this.appendObject(bucketName, key, blob, offset, options);
};

/** @type {IBosClient['appendObjectFromFile']} */
BosClient.prototype.appendObjectFromFile = function (bucketName, key, filename, offset, size, options) {
  options = options || {};
  if (size === 0) {
    return this.appendObjectFromString(bucketName, key, '', offset, options);
  }

  /** @type Record<string, string | number> */
  var headers = {};

  // append的起止位置应该在文件内
  var fileSize = fs.statSync(filename).size;
  if (size + offset > fileSize) {
    throw new Error("Can't read the content beyond the end of file.");
  }

  headers[H.CONTENT_LENGTH] = size;

  // 因为Firefox会在发起请求的时候自动给 Content-Type 添加 charset 属性
  // 导致我们计算签名的时候使用的 Content-Type 值跟服务器收到的不一样，为了
  // 解决这个问题，我们需要显式的声明Charset
  headers[H.CONTENT_TYPE] = options[H.CONTENT_TYPE] || MimeType.guess(path.extname(filename));
  options = u.extend(headers, options);

  var streamOptions = {
    start: offset || 0,
    end: (offset || 0) + size - 1
  };
  var fp = fs.createReadStream(filename, streamOptions);
  if (!u.has(options, H.CONTENT_MD5)) {
    var me = this;
    var fp2 = fs.createReadStream(filename, streamOptions);
    /** @type {Record<string, any>} */
    var opts = options || {};
    return crypto.md5stream(fp2).then(/** @param {any} md5sum */ function (md5sum) {
      opts[H.CONTENT_MD5] = md5sum;
      return me.appendObject(bucketName, key, fp, offset, opts);
    });
  }

  return this.appendObject(bucketName, key, fp, offset, options);
};

/** @type {IBosClient['appendObjectFromDataUrl']} */
BosClient.prototype.appendObjectFromDataUrl = function (bucketName, key, data, offset, options) {
  var buf = new Buffer(data, 'base64');

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_LENGTH] = buf.length;
  // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
  // headers[H.CONTENT_MD5] = require('./crypto').md5sum(data);
  options = u.extend(headers, options);

  return this.appendObject(bucketName, key, buf, offset, options);
};

/** @type {IBosClient['optionsObject']} */
BosClient.prototype.optionsObject = function (bucketName, objectName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!objectName) {
    throw new TypeError('objectName should not be empty.');
  }

  var opts = this._checkOptions(options || {});
  var headers = opts.headers;

  if (!headers.hasOwnProperty(H.ORIGIN)) {
    throw new TypeError('Origin should not be empty.');
  }

  if (!headers.hasOwnProperty(H.ACCESS_CONTROL_REQUEST_METHOD)) {
    throw new TypeError('Access-Control-Request-Method should not be empty.');
  }

  return this.sendRequest('OPTIONS', {
    bucketName,
    key: objectName,
    headers: headers,
    config: opts.config
  });
};

/** @type {IBosClient['listObjectVersions']} */
BosClient.prototype.listObjectVersions = function (bucketName, options) {
  options = options || {};
  var params = u.extend(
    {maxKeys: 1000},
    u.pick(options, 'maxKeys', 'prefix', 'marker', 'delimiter', 'versionIdMarker')
  );
  params.versions = '';

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: params,
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Object权限控制
 ************************************************************************************ */

/** @type {IBosClient['getObjectAcl']} */
BosClient.prototype.getObjectAcl = function (bucketName, key, options) {
  options = options || {};

  return this.sendRequest('GET', {
    bucketName: bucketName,
    key: key,
    params: {acl: ''},
    config: options.config
  });
};

/** @type {IBosClient['putObjectCannedAcl']} */
BosClient.prototype.putObjectCannedAcl = function (bucketName, key, cannedAcl, options) {
  options = options || {};

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.X_BCE_ACL] = cannedAcl;
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    key: key,
    headers: headers,
    params: {acl: ''},
    config: options.config
  });
};

/** @type {IBosClient['putObjectAcl']} */
BosClient.prototype.putObjectAcl = function (bucketName, key, acl, options) {
  options = options || {};

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    key: key,
    body: JSON.stringify({accessControlList: acl}),
    headers: headers,
    params: {acl: ''},
    config: options.config
  });
};

/** @type {IBosClient['deleteObjectAcl']} */
BosClient.prototype.deleteObjectAcl = function (bucketName, objectName, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!objectName) {
    throw new TypeError('objectName should not be empty.');
  }

  options = options || {};

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    key: objectName,
    params: {acl: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Object Select扫描
 ************************************************************************************ */

/** @type {IBosClient['selectObject']} */
BosClient.prototype.selectObject = function (bucketName, objectName, body, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty.');
  }

  if (!objectName) {
    throw new TypeError('objectName should not be empty.');
  }

  options = this._checkOptions(options || {});
  body = u.pick(body || {}, ['selectRequest', 'type']);

  if (!body.type || !~['json', 'csv'].indexOf(body.type)) {
    throw new TypeError('field "type" should be one of "json" and "csv".');
  }

  return this.sendRequest('POST', {
    bucketName,
    key: objectName,
    params: u.extend({select: '', type: body.type}),
    body: JSON.stringify({selectRequest: body.selectRequest}),
    headers: options.headers,
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  Object软链接
 ************************************************************************************ */

/** @type {IBosClient['putSymlink']} */
BosClient.prototype.putSymlink = function (bucketName, objectName, target, overwrite, options) {
  options = options || {};
  /** @type {Record<string, any>} */
  var headers = {};

  if (!target) {
    throw new TypeError('target object should not be empty.');
  }

  headers[H.X_BCE_SYMLINK_TARGET] = target;
  headers[H.X_BCE_FORBID_OVERWRITE] = overwrite === true;

  return this.sendRequest('PUT', {
    bucketName,
    key: objectName,
    params: {symlink: ''},
    headers: headers,
    config: options.config
  });
};

/** @type {IBosClient['getSymlink']} */
BosClient.prototype.getSymlink = function (bucketName, objectName, options) {
  options = options || {};

  return this.sendRequest('GET', {
    bucketName,
    key: objectName,
    params: {symlink: ''},
    config: options.config
  });
};

/** ***********************************************************************************
 *                                  分片上传
 ************************************************************************************ */

/** @type {IBosClient['initiateMultipartUpload']} */
BosClient.prototype.initiateMultipartUpload = function (bucketName, objectName, options) {
  options = options || {};

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_TYPE] = MimeType.guess(path.extname(objectName));

  options = this._checkOptions(u.extend(headers, options));

  return this.sendRequest('POST', {
    bucketName: bucketName,
    key: objectName,
    params: {uploads: ''},
    headers: options.headers,
    config: options.config
  });
};

/**
 * @type {IBosClient['uploadPart']}
 * @this {IBosClient}
 */
BosClient.prototype.uploadPart = function (bucketName, objectName, uploadId, partNumber, partSize, partFp, options) {
  if (!bucketName) {
    throw new TypeError('bucketName should not be empty');
  }

  if (!objectName) {
    throw new TypeError('objectName should not be empty');
  }

  if (partNumber < MIN_PART_NUMBER || partNumber > MAX_PART_NUMBER) {
    throw new TypeError(
      util.format(
        'Invalid partNumber %d. The valid range is from %d to %d.',
        partNumber,
        MIN_PART_NUMBER,
        MAX_PART_NUMBER
      )
    );
  }

  var client = this;

  // TODO(leeight) 计算md5的时候已经把 partFp 读完了，如果从头再来呢？
  var clonedPartFp = fs.createReadStream(partFp.path, {
    start: partFp.start,
    end: partFp.end
  });

  /** @type Record<string, string | number> */
  var headers = {};
  headers[H.CONTENT_LENGTH] = partSize;
  headers[H.CONTENT_TYPE] = 'application/octet-stream';
  // MD5在外部由调用方计算，这里不计算
  // headers[H.CONTENT_MD5] = partMd5;
  options = u.extend(headers, options);
  options = client._checkOptions(options || {});

  return client.sendRequest('PUT', {
    bucketName: bucketName,
    key: objectName,
    body: clonedPartFp,
    headers: options.headers,
    params: {
      partNumber: partNumber,
      uploadId: uploadId
    },
    config: options.config
  });
};

/** @type {IBosClient['uploadPartFromBlob']} */
BosClient.prototype.uploadPartFromBlob = function (bucketName, key, uploadId, partNumber, partSize, blob, options) {
  if (blob.size !== partSize) {
    throw new TypeError(util.format('Invalid partSize %d and data length %d', partSize, blob.size));
  }

  /** @type {Record<string, any>} */
  var headers = {};
  headers[H.CONTENT_LENGTH] = partSize;
  headers[H.CONTENT_TYPE] = 'application/octet-stream';
  // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
  // headers[H.CONTENT_MD5] = require('./crypto').md5sum(data);

  options = this._checkOptions(u.extend(headers, options));
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    key: key,
    body: blob,
    headers: options.headers,
    params: {
      partNumber: partNumber,
      uploadId: uploadId
    },
    config: options.config
  });
};

/** @type {IBosClient['uploadPartFromFile']} */
BosClient.prototype.uploadPartFromFile = function (
  bucketName,
  objectName,
  uploadId,
  partNumber,
  partSize,
  filename,
  offset,
  options
) {
  var start = offset;
  var end = offset + partSize - 1;
  var partFp = fs.createReadStream(filename, {
    start: start,
    end: end
  });
  return this.uploadPart(bucketName, objectName, uploadId, partNumber, partSize, partFp, options);
};

/** @type {IBosClient['uploadPartFromDataUrl']} */
BosClient.prototype.uploadPartFromDataUrl = function (
  bucketName,
  key,
  uploadId,
  partNumber,
  partSize,
  dataUrl,
  options
) {
  var data = new Buffer(dataUrl, 'base64');
  if (data.length !== partSize) {
    throw new TypeError(util.format('Invalid partSize %d and data length %d', partSize, data.length));
  }

  /** @type {Record<string, any>} */
  var headers = {};
  headers[H.CONTENT_LENGTH] = partSize;
  headers[H.CONTENT_TYPE] = 'application/octet-stream';
  // 对于浏览器调用API的时候，默认不添加 H.CONTENT_MD5 字段，因为计算起来比较慢
  // headers[H.CONTENT_MD5] = require('./crypto').md5sum(data);

  options = this._checkOptions(u.extend(headers, options));
  return this.sendRequest('PUT', {
    bucketName: bucketName,
    key: key,
    body: data,
    headers: options.headers,
    params: {
      partNumber: partNumber,
      uploadId: uploadId
    },
    config: options.config
  });
};

/** @type {IBosClient['uploadPartCopy']} */
BosClient.prototype.uploadPartCopy = function (
  sourceBucket,
  sourceKey,
  targetBucket,
  targetKey,
  uploadId,
  partNumber,
  range,
  options
) {
  if (!sourceBucket) {
    throw new TypeError('sourceBucket should not be empty');
  }
  if (!sourceKey) {
    throw new TypeError('sourceKey should not be empty');
  }
  if (!targetBucket) {
    throw new TypeError('targetBucket should not be empty');
  }
  if (!targetKey) {
    throw new TypeError('targetKey should not be empty');
  }
  if (partNumber < MIN_PART_NUMBER || partNumber > MAX_PART_NUMBER) {
    throw new TypeError(
      util.format(
        'Invalid partNumber %d. The valid range is from %d to %d.',
        partNumber,
        MIN_PART_NUMBER,
        MAX_PART_NUMBER
      )
    );
  }

  var opts = this._checkOptions(options || {});
  opts.headers['x-bce-copy-source'] = strings.normalize(util.format('/%s/%s', sourceBucket, sourceKey), false);
  opts.headers['x-bce-copy-source-range'] = range ? util.format('bytes=%s', range) : '';

  return this.sendRequest('PUT', {
    bucketName: targetBucket,
    key: targetKey,
    headers: opts.headers,
    config: opts.config,
    params: {partNumber: partNumber, uploadId: uploadId}
  });
};

/** @type {IBosClient['completeMultipartUpload']} */
BosClient.prototype.completeMultipartUpload = function (bucketName, objectName, uploadId, partList, options) {
  /** @type {Record<string, any>} */
  var headers = {};
  headers[H.CONTENT_TYPE] = 'application/json; charset=UTF-8';
  options = this._checkOptions(u.extend(headers, options));

  return this.sendRequest('POST', {
    bucketName: bucketName,
    key: objectName,
    body: JSON.stringify({parts: partList}),
    headers: options.headers,
    params: {uploadId: uploadId},
    config: options.config
  });
};

/** @type {IBosClient['abortMultipartUpload']} */
BosClient.prototype.abortMultipartUpload = function (bucketName, objectName, uploadId, options) {
  options = options || {};

  return this.sendRequest('DELETE', {
    bucketName: bucketName,
    key: objectName,
    params: {uploadId: uploadId},
    config: options.config
  });
};

/** @type {IBosClient['listParts']} */
BosClient.prototype.listParts = function (bucketName, objectName, uploadId, options) {
  if (!uploadId) {
    throw new TypeError('uploadId should not empty');
  }

  var allowedParams = ['maxParts', 'partNumberMarker', 'uploadId'];
  var opts = this._checkOptions(options || {}, allowedParams);
  opts.params.uploadId = uploadId;

  return this.sendRequest('GET', {
    bucketName: bucketName,
    key: objectName,
    params: opts.params,
    config: opts.config
  });
};

/**
 * 列出未完成的 Multipart Uploads
 *
 * @param bucketName 桶名称
 * @param options 额外的参数，包含Client配置信息，额外的请求头
 */
/** @type {IBosClient['listMultipartUploads']} */
BosClient.prototype.listMultipartUploads = function (bucketName, options) {
  var allowedParams = ['delimiter', 'maxUploads', 'keyMarker', 'prefix', 'uploads'];

  var opts = this._checkOptions(options || {}, allowedParams);
  opts.params.uploads = '';

  return this.sendRequest('GET', {
    bucketName: bucketName,
    params: opts.params,
    config: opts.config
  });
};

/** ***********************************************************************************
 *                                  通用性接口
 ************************************************************************************ */

/**
 * @type {IBosClient['generateUrl']}
 * @this {IBosClient}
 */
BosClient.prototype.generateUrl = function (bucketName, objectName, pipeline, cdn, config) {
  /** @type {BosRequestConfig & {endpoint?: string}} */
  var cfg = u.extend({}, this.config, config);
  bucketName = cfg.cname_enabled ? '' : bucketName;

  var resource = path
    .normalize(
      path.join(
        cfg.removeVersionPrefix ? '/' : '/v1',
        strings.normalize(bucketName || ''),
        strings.normalize(objectName || '', false)
      )
    )
    .replace(/\\/g, '/');

  // pipeline表示如何对图片进行处理.
  var command = '';
  if (pipeline) {
    if (u.isString(pipeline)) {
      if (/^@/.test(pipeline)) {
        command = pipeline;
      } else {
        command = '@' + pipeline;
      }
    } else {
      command =
        '@' +
        u
          .map(pipeline, /** @param {any} params */ function (params) {
            return u
              .map(params, /** @param {any} value @param {any} key */ function (value, key) {
                return [/** @type {Record<string, string>} */ (COMMAND_MAP)[key] || key, value].join('_');
              })
              .join(',');
          })
          .join('|');
    }
  }
  if (command) {
    // 需要生成图片转码url
    if (cdn) {
      return util.format('http://%s/%s%s', cdn, path.normalize(objectName), command);
    }
    return util.format('http://%s.%s/%s%s', path.normalize(bucketName), IMAGE_DOMAIN, path.normalize(objectName), command);
  }
  return util.format('%s%s%s', this.config.endpoint, resource, command);
};

/**
 * @type {IBosClient['generatePresignedUrl']}
 * @this {IBosClient}
 */
BosClient.prototype.generatePresignedUrl = function (
  bucketName,
  objectName,
  timestamp,
  expirationInSeconds,
  headers,
  params,
  headersToSign,
  config
) {
  /** @type {BosRequestConfig & {endpoint?: string}} */
  var cfg = u.extend({}, this.config, config);
  bucketName = cfg.cname_enabled ? '' : bucketName;

  var endpoint = cfg.endpoint || '';
  var pathStyleEnable = !!domainUtils.isIpHost(endpoint) || cfg.pathStyleEnable;

  // the endpoint provided in config, don't need to generate it by region
  endpoint = domainUtils.handleEndpoint({
    bucketName,
    endpoint,
    protocol: cfg.protocol,
    cname_enabled: cfg.cname_enabled,
    pathStyleEnable,
    customGenerateUrl: cfg.customGenerateUrl,
    lccLocation: cfg.lccLocation
  });

  params = params || {};

  var resource = path
    .normalize(
      path.join(
        cfg.removeVersionPrefix ? '/' : '/v1',
        !pathStyleEnable ? '' : strings.normalize(bucketName || ''),
        strings.normalize(objectName || '', false)
      )
    )
    .replace(/\\/g, '/');

  headers = headers || {};
  headers.Host = require('url').parse(endpoint).host;

  var credentials = cfg.credentials || /** @type {any} */ ({});
  var auth = new Auth(credentials.ak, credentials.sk);

  if (cfg.sessionToken) {
    params['x-bce-security-token'] = cfg.sessionToken;
  }

  // Generate the authorization string and return the signed url.
  var authorization = auth.generateAuthorization(
    'GET',
    resource,
    params,
    headers,
    /** @type {any} */ (timestamp),
    expirationInSeconds,
    headersToSign
  );

  params.authorization = authorization;

  return util.format('%s%s?%s', endpoint, resource, qs.encode(params));
};

/**
 * @type {IBosClient['createFolderShareUrl']}
 * @this {IBosClient}
 */
BosClient.prototype.createFolderShareUrl = function (body, config) {
  let endpoint = body.endpoint;

  if (!endpoint && body.region) {
    endpoint = `https://${body.region}.bcebos.com`;
  }

  if (!endpoint && this.config.endpoint) {
    endpoint = this.config.endpoint.replace(/^https?\:\/\//, '');
  }

  return this.sendRequest(
    'POST',
    {
      body: JSON.stringify(u.extend({endpoint: endpoint}, body)),
      config: u.extend({protocol: 'https'}, config),
      params: {action: 'urlGet'}
    },
    'https://bos-share.baidubce.com/'
  );
};

/**
 * 进度回调函数
 *
 * @callback progressCallback
 * @param {Object} options 回调参数
 * @param {string} options.speed 当前上传速度
 * @param {string} options.progress 当前上传进度
 * @param {string} options.percent 当前上传进度-百分比
 * @param {number} options.uploadedBytes 已上传字节数
 * @param {number} options.totalBytes 文件总字节数
 */

/**
 * 进度回调函数
 *
 * @callback stateChangeCallback
 * @param {string} state 状态
 * @param {string} options.message 回调数据
 * @param {Object} options.data 回调数据
 */

/** @type {IBosClient['putSuperObject']} */
BosClient.prototype.putSuperObject = function (params) {
  params = params || /** @type {any} */ ({});
  const {objectName, data} = params;
  /** 上传文件的最大体积, 单位为bytes */
  const MAX_UPLOAD_FILE_SIZE = 48.8 * 1024 ** 4;
  // 上传后文件媒体类型
  const ContentType = params.ContentType || MimeType.guess(path.extname(objectName));
  // 文件大小, 单位bytes
  let ContentLength = params.ContentLength;
  // 数据类型: File, Buffer, Stream, Blob
  let dataType = '';

  if (typeof data === 'string') {
    ContentLength = fs.lstatSync(data).size;
    dataType = 'File';
  } else if (Buffer.isBuffer(data)) {
    ContentLength = data.length;
    dataType = 'Buffer';
  } else if (typeof stream === 'function' && data instanceof stream.Readable) {
    dataType = 'Stream';
  } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
    ContentLength = data.size;
    dataType = 'Blob';
  }

  if (!dataType) {
    throw new Error(`Unsupported data type: ${dataType}`);
  }

  if ((ContentLength || 0) > MAX_UPLOAD_FILE_SIZE) {
    throw new Error('File size should be less or equal than 48.8TB.');
  }

  if (dataType === 'Stream') {
    throw new Error('file type is Stream, please use `putObject` API.');
  }

  const self = this;
  const instance = new SuperUpload(self, u.extend(params, {ContentLength, ContentType, dataType}));

  return /** @type {any} */ (instance);
};

// --- E N D ---

/**
 * @type {IBosClient['sendRequest']}
 * @this {IBosClient}
 */
BosClient.prototype.sendRequest = function (httpMethod, varArgs, requestUrl) {
  debug('<sendRequest> httpMethod = %j', httpMethod);
  debug('<sendRequest> varArgs = %j', varArgs);
  debug('<sendRequest> requestUrl = %j', requestUrl);

  var defaultArgs = {
    bucketName: null,
    key: null,
    body: null,
    headers: {},
    params: {},
    config: {},
    outputStream: null
  };

  var endpoint = this.config.endpoint;

  const bucketName = varArgs.bucketName;
  /**
   * 优先使用API级别传入的region配置，如果未设置，则使用全局endpoint继续处理
   */
  const region = varArgs.config ? varArgs.config.region : '';
  const localRemoveVersionPrefix = varArgs.config ? varArgs.config.removeVersionPrefix : false;
  const versionPrefix = localRemoveVersionPrefix || this.config.removeVersionPrefix ? '/' : '/v1';

  varArgs.bucketName = this.config.cname_enabled ? '' : bucketName;

  const customGenerateUrl =
    varArgs.config && varArgs.config.customGenerateUrl
      ? varArgs.config.customGenerateUrl
      : this.config.customGenerateUrl
      ? this.config.customGenerateUrl
      : undefined;

  var pathStyleEnable = !!domainUtils.isIpHost(endpoint) || this.config.pathStyleEnable;

  // provide the method for generating url
  if (typeof customGenerateUrl === 'function') {
    const options = {lccLocation: varArgs.config ? varArgs.config.lccLocation : undefined};
    endpoint = customGenerateUrl(bucketName || '', region, options);
    var resource =
      requestUrl ||
      path.normalize(path.join(versionPrefix, strings.normalize(varArgs.key || '', false))).replace(/\\/g, '/');
  } else {
    endpoint = domainUtils.handleEndpoint({
      bucketName,
      endpoint,
      region,
      protocol: this.config.protocol,
      cname_enabled: this.config.cname_enabled,
      pathStyleEnable,
      lccLocation: varArgs.config ? varArgs.config.lccLocation : undefined
    });

    var resource =
      requestUrl ||
      path
        .normalize(
          path.join(
            versionPrefix ? '/' : '/v1',
            // if pathStyleEnable is true
            !pathStyleEnable ? '' : strings.normalize(varArgs.bucketName || ''),
            strings.normalize(varArgs.key || '', false)
          )
        )
        .replace(/\\/g, '/');
  }

  var args = u.extend(defaultArgs, varArgs);
  var config = u.extend({}, this.config, args.config, {endpoint});

  debug('<sendRequest> args = %j', args);
  debug('<sendRequest> config = %j', config);

  if (config.sessionToken) {
    args.headers[H.SESSION_TOKEN] = config.sessionToken;
  }
  return this.sendHTTPRequest(httpMethod, resource, args, config);
};

// BosClient.prototype.createSignature = function (credentials, httpMethod, path, params, headers) {
//     var revisionTimestamp = Date.now() + (this.timeOffset || 0);

//     headers[H.X_BCE_DATE] = new Date(revisionTimestamp).toISOString().replace(/\.\d+Z$/, 'Z');

//     var auth = new Auth(credentials.ak, credentials.sk);
//     return auth.generateAuthorization(httpMethod, path, params, headers, revisionTimestamp / 1000);
// };

/**
 * @type {IBosClient['sendHTTPRequest']}
 * @this {IBosClient}
 */
BosClient.prototype.sendHTTPRequest = function (httpMethod, resource, args, config) {
  /** @type {IBosClient} */
  var client = /** @type {any} */ (this);

  /** @this {IBosClient} */
  function doRequest() {
    var agent = (this._httpAgent = new HttpClient(config));
    var httpContext = {
      httpMethod: httpMethod,
      resource: resource,
      args: args,
      config: config
    };
    u.each(['progress', 'error', 'abort', 'timeout'], function (/** @type string */ eventName) {
      agent.on(eventName, function (evt) {
        client.emit(eventName, evt, httpContext);
      });
    });

    var promise = this._httpAgent.sendRequest(
      httpMethod,
      resource,
      args.body,
      args.headers,
      args.params,
      // 支持自定义签名函数
      u.isFunction(config.createSignature) ? u.bind(config.createSignature, this) : u.bind(this.createSignature, this),
      args.outputStream
    );

    /** @type {any} */ (promise).abort = function () {
      if (agent._req) {
        // 浏览器请求
        if (agent._req.xhr) {
          var xhr = agent._req.xhr;
          xhr.abort();
        }
        // node环境下可能拿不到xhr实例，直接调用_req的abort方法
        else if (config.requestInstance) {
          agent._req.abort();
        }
      }
    };

    return promise;
  }

  const instance = (/** @type {(this: IBosClient) => any} */ (doRequest)).call(client);
  const result = instance.catch(/** @param {any} err */ function (err) {
    var serverTimestamp = new Date(err[H.X_BCE_DATE]).getTime();

    BceBaseClient.prototype.timeOffset = serverTimestamp - Date.now();

    if (err[H.X_STATUS_CODE] === 403 && err[H.X_CODE] === 'RequestTimeTooSkewed') {
      return (/** @type {(this: IBosClient) => any} */ (doRequest)).call(client);
    }

    return Q.reject(err);
  });

  if (config.requestInstance) {
    return [result, instance];
  }
  return result;
};

/**
 * @type {IBosClient['signPostObjectPolicy']}
 * @this {IBosClient}
 */
BosClient.prototype.signPostObjectPolicy = function (policy) {
  var credentials = this.config.credentials;
  var auth = new Auth(credentials.ak, credentials.sk);

  var encodedPolicy = new Buffer(JSON.stringify(policy)).toString('base64');
  var signature = auth.hash(encodedPolicy, credentials.sk);

  return {
    policy: encodedPolicy,
    signature: signature
  };
};

/**
 * 归一化 BosClientAPIOptions：拆分出 config / params / headers。
 *
 * @internal
 * @param {Record<string, any>} options
 * @param {string[]} [allowedParams]
 * @returns {{config: any, params: Record<string, any>, headers: Record<string, any>}}
 */
BosClient.prototype._checkOptions = function (options, allowedParams) {
  var rv = {};

  rv.config = options.config || {};
  rv.headers = this._prepareObjectHeaders(options);
  rv.params = u.pick(options, allowedParams || []);

  if (options.versionId && typeof options.versionId === 'string') {
    rv.versionId = options.versionId;
  }

  /** 如果使用callback参数格式传入，将参数处理为字符串格式 */
  if (!u.has(options, H.X_BCE_PROCESS) && u.has(options, 'callback')) {
    const callbackParams = u.extend(
      {
        /** urls, 缩写为u */
        u: Base64.urlEncode(options.callback.urls),
        /** mode, 缩写为u */
        m: 'sync',
        v: Base64.urlEncode(options.callback.vars)
      },
      /** encrypt, 缩写为e */
      options.callback.encrypt && options.callback.encrypt === 'config' ? {e: 'config'} : {},
      /** key, 缩写为k */
      options.callback.key ? {k: options.callback.key} : {}
    );
    let callbackStr = '';
    const callbackKeys = Object.keys(callbackParams);

    callbackKeys.forEach((key, index) => {
      callbackStr += key + '_' + callbackParams[key] + (index === callbackKeys.length - 1 ? '' : ',');
    });

    if (callbackStr) {
      rv.headers[H.X_BCE_PROCESS] = 'callback/callback,' + callbackStr;
    }
  }

  return rv;
};

/**
 * 校验并归一化 Object 相关请求头，过滤白名单内合法 Header。
 *
 * @internal
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
BosClient.prototype._prepareObjectHeaders = function (options) {
  var allowedHeaders = [
    H.ORIGIN,
    H.ACCESS_CONTROL_REQUEST_METHOD,
    H.ACCESS_CONTROL_REQUEST_HEADERS,
    H.CONTENT_LENGTH,
    H.CONTENT_ENCODING,
    H.CONTENT_MD5,
    H.X_BCE_CONTENT_SHA256,
    H.CONTENT_TYPE,
    H.CONTENT_DISPOSITION,
    H.ETAG,
    H.SESSION_TOKEN,
    H.CACHE_CONTROL,
    H.EXPIRES,
    H.X_BCE_ACL,
    H.X_BCE_GRANT_READ,
    H.X_BCE_GRANT_FULL_CONTROL,
    H.X_BCE_OBJECT_ACL,
    H.X_BCE_OBJECT_GRANT_READ,
    H.X_BCE_STORAGE_CLASS,
    H.X_BCE_SERVER_SIDE_ENCRYPTION,
    H.X_BCE_RESTORE_DAYS,
    H.X_BCE_RESTORE_TIER,
    H.X_BCE_SYMLINK_TARGET,
    H.X_BCE_FORBID_OVERWRITE,
    H.X_BCE_TRAFFIC_LIMIT,
    H.X_BCE_FETCH_SOURCE,
    H.X_BCE_FETCH_MODE,
    H.X_BCE_CALLBACK_ADDRESS,
    H.X_BCE_FETCH_REFERER,
    H.X_BCE_FETCH_USER_AGENT,
    H.X_BCE_PROCESS,
    H.X_BCE_SOURCE,
    H.X_BCE_TAGGING
  ];
  var metaSize = 0;
  var headers = u.pick(options, function (/** @type any */value, /** @type any */key) {
    if (allowedHeaders.indexOf(key) !== -1) {
      return true;
    } else if (/^x\-bce\-meta\-/.test(key)) {
      metaSize += Buffer.byteLength(key) + Buffer.byteLength('' + value);
      return true;
    }
  });

  if (metaSize > MAX_USER_METADATA_SIZE) {
    throw new TypeError('Metadata size should not be greater than ' + MAX_USER_METADATA_SIZE + '.');
  }

  if (u.has(headers, H.CONTENT_LENGTH)) {
    var contentLength = headers[H.CONTENT_LENGTH];
    if (contentLength < 0) {
      throw new TypeError('content_length should not be negative.');
    } else if (contentLength > MAX_PUT_OBJECT_LENGTH) {
      // 5G
      throw new TypeError(
        'Object length should be less than ' + MAX_PUT_OBJECT_LENGTH + '. Use multi-part upload instead.'
      );
    }
  }

  if (u.has(headers, 'ETag')) {
    var etag = headers.ETag;
    if (!/^"/.test(etag)) {
      headers.ETag = util.format('"%s"', etag);
    }
  }

  if (!u.has(headers, H.CONTENT_TYPE)) {
    headers[H.CONTENT_TYPE] = 'application/octet-stream';
  }

  if (u.has(headers, H.X_BCE_STORAGE_CLASS)) {
    const storageClass = headers[H.X_BCE_STORAGE_CLASS];
    const STORAGE_CLASS = [
      /** 标准存储类型 */
      'STANDARD',
      /** 低频存储 */
      'STANDARD_IA',
      /** 归档存储 */
      'ARCHIVE',
      /** 冷存储 */
      'COLD',
      /** 标准存储-多AZ */
      'MAZ_STANDARD',
      /** 低频存储-多AZ */
      'MAZ_STANDARD_IA'
    ];

    if (!STORAGE_CLASS.includes(storageClass)) {
      headers[H.X_BCE_STORAGE_CLASS] = STORAGE_CLASS[0];
    }
  }

  return headers;
};

module.exports = BosClient;

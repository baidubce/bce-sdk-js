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
 * @file src/helper.js
 * @author leeight
 */
var fs = require('fs');
var stream = require('stream');

var async = require('async');
var u = require('underscore');
var Q = require('q');
var debug = require('debug')('bce-sdk:helper');
var strings = require('./strings');
var url = require('url');
var util = require('util');
var config = require('./config');

// 超过这个限制就开始分片上传
var MIN_MULTIPART_SIZE = 5 * 1024 * 1024; // 5M

// 分片上传的时候，每个分片的大小
var PART_SIZE = 1 * 1024 * 1024; // 1M

var DATA_TYPE_FILE = 1;
var DATA_TYPE_BUFFER = 2;
var DATA_TYPE_STREAM = 3;
var DATA_TYPE_BLOB = 4;

// cname形式的域名列表
var DEFAULT_CNAME_LIKE_LIST = ['.cdn.bcebos.com'];

exports.omitNull = function (value, key, object) {
  return value != null;
};

/**
 * 自适应的按需上传文件
 *
 * @param {BosClient} client The bos client instance.
 * @param {string} bucket The bucket name.
 * @param {string} object The object name.
 * @param {Blob|Buffer|stream.Readable|string} data The data.
 * @param {Object} options The request options.
 * @return {Promise}
 */
exports.upload = function (client, bucket, object, data, options) {
  var contentLength = 0;
  var dataType = -1;
  if (typeof data === 'string') {
    // 文件路径
    // TODO 如果不存在的话，会抛异常，导致程序退出？
    contentLength = fs.lstatSync(data).size;
    dataType = DATA_TYPE_FILE;
  } else if (Buffer.isBuffer(data)) {
    // Buffer
    contentLength = data.length;
    dataType = DATA_TYPE_BUFFER;
  } else if (data instanceof stream.Readable) {
    dataType = DATA_TYPE_STREAM;
  } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
    // 浏览器里面的对象
    contentLength = data.size;
    dataType = DATA_TYPE_BLOB;
  }

  if (dataType === -1) {
    throw new Error('Unsupported `data` type.');
  }

  if (dataType === DATA_TYPE_STREAM) {
    // XXX options['Content-Length'] 应该呗设置过了吧？
    // 这种情况无法分片上传，只能直传了
    return client.putObject(bucket, object, data, options);
  } else if (contentLength <= MIN_MULTIPART_SIZE) {
    if (dataType === DATA_TYPE_FILE) {
      return client.putObjectFromFile(bucket, object, data, options);
    } else if (dataType === DATA_TYPE_BUFFER) {
      return client.putObject(bucket, object, data, options);
    } else if (dataType === DATA_TYPE_BLOB) {
      return client.putObjectFromBlob(bucket, object, data, options);
    }
  } else if (contentLength > MIN_MULTIPART_SIZE) {
    // 开始分片上传
    debug('%s > %s -> multi-part', contentLength, MIN_MULTIPART_SIZE);
    return uploadViaMultipart(client, data, dataType, bucket, object, contentLength, PART_SIZE, options);
  }
};

/* eslint-disable */
/**
 * 自适应的按需上传文件
 *
 * @param {BosClient} client The bos client instance.
 * @param {string|Buffer|Blob} data The uploaded content.
 * @param {number} dataType The body data type.
 * @param {string} bucket The bucket name.
 * @param {string} object The object name.
 * @param {number} size The body size.
 * @param {number} partSize The multi-part size.
 * @param {Object} options The request options.
 * @return {Promise}
 */
function uploadViaMultipart(client, data, dataType, bucket, object, size, partSize, options) {
  var uploadId;

  return client
    .initiateMultipartUpload(bucket, object, options)
    .then(function (response) {
      uploadId = response.body.uploadId;
      debug('initiateMultipartUpload = %j', response);

      var deferred = Q.defer();
      var tasks = getTasks(data, uploadId, bucket, object, size, partSize);
      var state = {
        lengthComputable: true,
        loaded: 0,
        total: tasks.length
      };
      async.mapLimit(tasks, 2, uploadPart(client, dataType, state), function (error, results) {
        if (error) {
          deferred.reject(error);
        } else {
          deferred.resolve(results);
        }
      });
      return deferred.promise;
    })
    .then(function (responses) {
      var parts = u.map(responses, function (response, index) {
        return {
          partNumber: index + 1,
          eTag: response.http_headers.etag
        };
      });
      debug('parts = %j', parts);
      return client.completeMultipartUpload(bucket, object, uploadId, parts);
    });
}
/* eslint-enable */

function uploadPart(client, dataType, state) {
  return function (task, callback) {
    var resolve = function (response) {
      ++state.loaded;
      client.emit('progress', state);
      callback(null, response);
    };
    var reject = function (error) {
      callback(error);
    };

    if (dataType === DATA_TYPE_FILE) {
      debug('client.uploadPartFromFile(%j)', u.omit(task, 'data'));
      return client
        .uploadPartFromFile(
          task.bucket,
          task.object,
          task.uploadId,
          task.partNumber,
          task.partSize,
          task.data,
          task.start
        )
        .then(resolve, reject);
    } else if (dataType === DATA_TYPE_BUFFER) {
      // 没有直接 uploadPartFromBuffer 的接口，借用 DataUrl
      debug('client.uploadPartFromDataUrl(%j)', u.omit(task, 'data'));
      var dataUrl = task.data.slice(task.start, task.stop + 1).toString('base64');
      return client
        .uploadPartFromDataUrl(task.bucket, task.object, task.uploadId, task.partNumber, task.partSize, dataUrl)
        .then(resolve, reject);
    } else if (dataType === DATA_TYPE_BLOB) {
      debug('client.uploadPartFromBlob(%j)', u.omit(task, 'data'));
      var blob = task.data.slice(task.start, task.stop + 1);
      return client
        .uploadPartFromBlob(task.bucket, task.object, task.uploadId, task.partNumber, task.partSize, blob)
        .then(resolve, reject);
    }
  };
}

function getTasks(data, uploadId, bucket, object, size, partSize) {
  var leftSize = size;
  var offset = 0;
  var partNumber = 1;

  var tasks = [];
  while (leftSize > 0) {
    /* eslint-disable */
    var xPartSize = Math.min(leftSize, partSize);
    /* eslint-enable */
    tasks.push({
      data: data, // Buffer or Blob
      uploadId: uploadId,
      bucket: bucket,
      object: object,
      partNumber: partNumber,
      partSize: xPartSize,
      start: offset,
      stop: offset + xPartSize - 1
    });

    leftSize -= xPartSize;
    offset += xPartSize;
    partNumber += 1;
  }

  return tasks;
}

/**
 * 获取域名不带协议的部分
 * @param {string} host
 * @returns
 */
const getDomainWithoutProtocal = function (host) {
  const url = new URL(host);
  return {
    protocol: url.protocol,
    host: url.host
  };
};

/**
 * 获取域名中不带端口号的部分
 * @param {string} host
 * @return {string}
 */
function _getHostname(originHost) {
  const url = new URL(originHost);

  return url.hostname;
}

// virutal host：<bucket>.<region>.bcebos.com
// custom domain return false
const isVirtualHost = function (host) {
  const domain = _getHostname(host);
  const arr = domain.split('.');
  if (arr.length !== 4) {
    return false;
  }
  // bucketName rule: 只能包含小写字母、数字和“-”，开头结尾为小写字母和数字，长度在4-63之间
  // ends with bcebos.com
  if (!/^[a-z\d][a-z-\d]{2,61}[a-z\d]\.[a-z\d]+\.bcebos\.com$/.test(arr[0])) {
    return false;
  }

  return true;
};

// 判断是否为ipv4
const isIPv4 = function(input) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(input);
};

// 判断是否为ipv6
const isIPv6 = function(input) {
  return /^(([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))$/.test(input);
};

// 判断是否为ip host
const isIpHost = function (host) {
  const domain = _getHostname(host);

  return isIPv4(domain) || isIPv6(domain);
};

// 判断是否为bos默认官方 host
const isBosHost = function (host) {
  const domain = _getHostname(host);
  const arr = domain.split('.');
  if (domain === 'bj-bos-sandbox.baidu-int.com') {
    return true;
  }
  if (arr.length !== 3) {
    return false;
  }
  if (!/\.bcebos\.com$/.test(domain)) {
    return false;
  }
  return true;
};

// CDN域名 ｜ virtualHost
const isCnameLikeHost = function (host) {
  // CDN加速 <xxx>.cdn.bcebos.com
  if (DEFAULT_CNAME_LIKE_LIST.some((suffix) => strings.hasSuffix(host.toLowerCase(), suffix))) {
    return true;
  }
  // virtual host
  if (isVirtualHost(host)) {
    return true;
  }
  return false;
};

const needCompatibleBucketAndEndpoint = function (bucket, endpoint) {
  if (!bucket || bucket === '') {
    return false;
  }
  // virtual host
  if (!isVirtualHost(endpoint)) {
    return false;
  }
  // <bucket>.xxx
  if (endpoint.split('.')[0] === bucket) {
    return false;
  }
  // bucket from api and from endpoint is different
  // bucket = AAAA，endpoint = BBBB.bcebos.com
  // if like so, just pass to server and it will handle
  return true;
};

/**
 * replace endpoint by bucket, only effective when two bucket are in same region, otherwise server return NoSuchBucket error
 * @param {*} bucket
 * @param {*} endpoint
 * @returns
 */
const replaceEndpointByBucket = function (bucket, endpoint) {
  const {protocol, host} = getDomainWithoutProtocal(endpoint);
  const arr = host.split('.');
  arr[0] = protocol + bucket;
  return arr.join('.');
};

/**
 * compute base endpoint
 */
const generateBaseEndpoint = function (protocol, region) {
  return util.format('%s://%s.%s',
    protocol,
    region,
    config.DEFAULT_BOS_DOMAIN);
}

/**
 * handle endpoint
 */
const handleEndpoint = function ({
  bucketName,
  endpoint, 
  protocol,
  region,
  customGenerateUrl,
  cname_enabled=false,
  pathStyleEnable=false,
}) {
  var resolvedEndpoint = endpoint;
  // 有自定义域名函数
  if (customGenerateUrl) {
    return customGenerateUrl(bucketName, region);
  }
  
  // 使用的是自定义域名 / virtual-host
  if (isCnameLikeHost(resolvedEndpoint) || cname_enabled) {
    // if virtual host endpoint and bucket is not empty, compatible bucket and endpoint
    if (needCompatibleBucketAndEndpoint(bucketName, resolvedEndpoint)) {
        // bucket from api and from endpoint is different
        resolvedEndpoint = replaceEndpointByBucket(bucketName, resolvedEndpoint);
    }
  }
  else {
    // 非ip/bns，pathStyleEnable不为true，强制转为pathStyle
    // 否则保持原状
    if (!pathStyleEnable && !isIpHost(resolvedEndpoint)) {
        // if this region is provided, generate base endpoint
        if (region) {
          resolvedEndpoint = generateBaseEndpoint(protocol, region);
        }
        // service级别的接口不需要转换
        if (bucketName && isBosHost(resolvedEndpoint)) {
          const {protocol, host} = getDomainWithoutProtocal(resolvedEndpoint);
          resolvedEndpoint = protocol + '//' + bucketName + '.' + host;
        }
    }
  }
  return resolvedEndpoint;
}

exports.domainUtils = {
  getDomainWithoutProtocal,
  isVirtualHost,
  isIpHost,
  isBosHost,
  isCnameLikeHost,
  needCompatibleBucketAndEndpoint,
  replaceEndpointByBucket,
  generateBaseEndpoint,
  handleEndpoint
};

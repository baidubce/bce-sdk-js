/**
 * @file src/bos/multipart_upload.js
 * @desc encapsulation for mutipart upload API
 * @author lurunze
 */

const sortBy = require('lodash/sortBy');
const omit = require('lodash/omit');
const mean = require('lodash/mean');
const dayjs = require('dayjs');
const {filesize} = require('filesize');
var async = require('async');
var debug = require('debug')('bce-sdk:super-upload');

var H = require('../headers');
var Enums = require('./enums');

const BosClient = require('../bos_client');

const fileSizeBase = 1024;
/** 上传文件分片最大体积 5GB, 单位为bytes */
const MAX_UPLOAD_PART_SIZE = 5 * fileSizeBase ** 3;
/** 上传文件分片最小体积 100KB, 单位为bytes */
const MIN_UPLOAD_PART_SIZE = 100 * fileSizeBase;
/** 上传文件分片默认体积, 单位为bytes */
const DEFAULT_UPLOAD_PART_SIZE = 5 * fileSizeBase ** 2;
/* 最小分片数 */
const MIN_UPLOAD_PART_COUNT = 1;
/* 最大分片数 */
const MAX_UPLOAD_PART_COUNT = 10000;
/* 默认上传任务分片并发数 */
const UPLOAD_PART_CONCURRENCY = 5;

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
 * @param {Object} options 回调数据
 * @param {string} options.message 回调数据
 * @param {Object|null} options.data 回调数据
 */

/**
 * @typedef SuperUploadOptions
 * @type {object}
 * @property {string} bucketName 存储桶名称
 * @property {string} objectName 上传后对象名称
 * @property {string|Buffer|Blob} data 上传数据, 类型为string时表示文件路径
 * @property {string} ContentLength 文件大小
 * @property {string} ContentType MimeType
 * @property {number} [chunkSize=5*1024**2] 默认分片大小, 单位为bytes
 * @property {number} [partConcurrency=5] 分片并发数
 * @property {string} [StorageClass=STANDARD] 存储类型
 * @property {string=} createTime 任务创建时间
 * @property {string=} uploadId 上传ID, 如果存在则表示任务已经初始化
 * @property {progressCallback=} onProgress 上传进度回调函数
 * @property {stateChangeCallback=} onStateChange 状态变化回调函数
 */

class SuperUpload {
  /**
   * 自适应上传构造器
   *
   * @param {BosClient} client BosClient实例
   * @param {SuperUploadOptions} options 参数
   */
  constructor(client, options) {
    options = options || {};

    this.client = client;
    this.state = Enums.STATE.WAITING;
    this.__init(options);
  }

  /**
   * 初始化任务
   *
   * @param {SuperUploadOptions} options 参数
   */
  __init(options) {
    if (this.state !== Enums.STATE.WAITING) {
      debug('[__init] super upload already inited, skip.');
      return;
    }

    // 桶名称
    this.bucketName = options.bucketName;
    // 上传后对象名称
    this.objectName = options.objectName;
    // 数据
    this.data = options.data;
    // 上传任务ID，如果存在则表示任务已经初始化
    this.uploadId = options.uploadId;
    // 上传后文件类型
    this.ContentType = options.ContentType;
    // 文件大小，单位bytes
    this.ContentLength = options.ContentLength;
    // 存储类型
    this.StorageClass = options.StorageClass || Enums.STORAGE_CLASS.STANDARD;
    // 分片并发数
    this.partConcurrency =
      Number.isInteger(options.partConcurrency) && options.partConcurrency > 0
        ? options.partConcurrency
        : UPLOAD_PART_CONCURRENCY;
    // 默认分片大小
    this.chunkSize =
      Number.isInteger(options.chunkSize) && options.chunkSize > 0 ? options.chunkSize : DEFAULT_UPLOAD_PART_SIZE;
    // 分片上传任务的ID
    this.uploadId = options.uploadId || '';
    // 任务创建时间
    this.createTime = options.createTime || dayjs().format('YYYY-MM-DDTHH:mm:ssZ');
    /**
     * 上传进度回调函数
     * @type {progressCallback=}
     */
    this.onProgress =
      options.onProgress && typeof options.onProgress === 'function' ? options.onProgress.bind(this) : null;
    /**
     * 状态变化回调函数
     * @type {stateChangeCallback=}
     */
    this.onStateChange =
      options.onStateChange && typeof options.onStateChange === 'function' ? options.onStateChange.bind(this) : null;

    // 数据类型
    this.__dataType = options.dataType;
    // 已上传的字节数
    this.__uploadedBytes = 0;
    // 已上传分片
    this.__uploadedParts = [];
    // 分片上传速度集合，单位bytes/s
    this.__speeds = [];
    // 异常任务集合
    this.__exceptionParts = [];
    // 异常任务重试次数，
    this.__retryTimes = 0;
    // 任务队列
    this.__queue = async.queue(this.__uploadPart(), this.partConcurrency);
    /** 监听队列是否完成 */
    this.__queue.drain(() => {
      debug('[queue] super upload queue drained.');
      this.__complete();
    });
    /** 队列任务错误 */
    this.__queue.error((error, task) => {
      debug('[queue] super upload queue task error: %j, task: %j', error, task);
    });

    // 任务状态
    this.state = Enums.STATE.INITED;

    const onStateChange = this.onStateChange;
    if (onStateChange) {
      onStateChange(Enums.STATE.INITED, {
        message: 'bce-sdk:super-upload super upload inited.',
        data: null
      });
    }
  }

  /**
   * 开始任务
   */
  async start() {
    if (this.state !== Enums.STATE.WAITING && this.state !== Enums.STATE.INITED) {
      debug('[start] super upload already started, skip.');
      return;
    }

    const client = this.client;
    const dataType = this.__dataType;
    const bucketName = this.bucketName;
    const objectName = this.objectName;

    // 分片上传
    debug(
      '[start] Multipart upload ready to start: %s - %s - %s - %s - %s',
      bucketName,
      objectName,
      dataType,
      this.ContentType,
      this.ContentLength
    );

    let uploadId = this.uploadId;

    if (!uploadId) {
      try {
        // 未提供uploadId, 初始化任务
        const response = await client.initiateMultipartUpload(bucketName, objectName, {
          [H.CONTENT_LENGTH]: 0,
          [H.CONTENT_TYPE]: this.ContentType
        });
        debug('[start] Multipart upload inited, <initiateMultipartUpload> --->: %O', response.body);
        uploadId = this.uploadId = response.body.uploadId;
      } catch (error) {
        debug('[start] Multipart upload init failed: %s', error.message);
        this.state = Enums.STATE.FAILED;
        const onStateChange = this.onStateChange;
        if (onStateChange) {
          onStateChange(Enums.STATE.FAILED, {
            message: `bce-sdk:super-upload initiateMultipartUpload failed: ${error.message}`,
            data: []
          });
        }
        return [];
      }
    } else {
      debug('[start] Multipart upload already inited, resume from checkpoint');
    }

    // 获取已上传的分片列表及相关信息，对于全新的任务，这里仅为了获取服务端的创建时间，并检验分片任务是否已经创建成功
    let {parts, uploadedBytes, nextPartNum, createTime, error} = await this.__listExistedParts();

    // 检查uploadId是否有效
    if (error) {
      this.state = Enums.STATE.FAILED;
      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.FAILED, {
          message: `bce-sdk:super-upload list part failed: ${error.message}`,
          data: null
        });
      }

      debug('[start] list part failed: %s', error.message);
      return [];
    }

    this.createTime = dayjs(createTime).unix();
    this.__uploadedBytes = uploadedBytes;
    this.__uploadedParts = parts;

    /** 上传完成就结束任务 */
    if (uploadedBytes >= this.ContentLength) {
      return this.__complete();
    }

    const tasks = this.__getMicroTasks(uploadId, uploadedBytes, parts.length, nextPartNum);

    if (!tasks || tasks.length === 0) {
      return [];
    }

    // 任务推入队列，会自动开始，单个任务异常不会阻塞队列
    tasks.forEach((microTask) => {
      this.__queue.push(microTask);
    });

    this.state = Enums.STATE.RUNNING;
    const onStateChange = this.onStateChange;
    if (onStateChange) {
      onStateChange(Enums.STATE.RUNNING, {
        message: 'bce-sdk:super-upload super upload started.',
        data: null
      });
    }

    return tasks;
  }

  /**
   * 暂停任务
   */
  pause() {
    if (this.state !== Enums.STATE.RUNNING) {
      debug('[pause] Super upload is not running, can not be paused.');
      return false;
    }

    this.__queue.pause();
    this.state = Enums.STATE.PAUSED;
    const onStateChange = this.onStateChange;
    if (onStateChange) {
      onStateChange(Enums.STATE.PAUSED, {
        message: `bce-sdk:super-upload super upload paused.`,
        data: {
          uploadedParts: this.__uploadedParts
        }
      });
    }
    debug('[pause] Super upload is paused.');
    return true;
  }

  /**
   * 恢复任务
   */
  resume() {
    if (this.state !== Enums.STATE.PAUSED) {
      debug('[resume] Super upload is not paused, can not be resumed.');
      return false;
    }

    this.__queue.resume();
    this.state = Enums.STATE.RUNNING;
    const onStateChange = this.onStateChange;
    if (onStateChange) {
      onStateChange(Enums.STATE.RUNNING, {
        message: `bce-sdk:super-upload super upload resumed.`,
        data: {
          uploadedParts: this.__uploadedParts
        }
      });
    }
    debug('[resume] Super upload is resumed.');
    return true;
  }

  /**
   * 取消任务
   */
  async cancel() {
    if (this.state === Enums.STATE.WAITING) {
      debug('[cancel] Super upload is waiting, can not cancel.');
      return false;
    } else if (this.state === Enums.STATE.CANCELLED) {
      debug('[cancel] Super upload is already cancelled.');
      return false;
    } else if (this.state === Enums.STATE.FAILED) {
      debug('[cancel] Super upload is failed, can not cancel.');
      return false;
    }

    const client = this.client;
    const bucketName = this.bucketName;
    const objectName = this.objectName;
    const uploadId = this.uploadId;

    if (!uploadId) {
      debug('[cancel] uploadId not found.');
      return false;
    }

    try {
      // 先暂停队列，再清空分片任务
      this.__queue.pause();
      this.__queue.kill();
      const response = await client.abortMultipartUpload(bucketName, objectName, uploadId);

      this.state = Enums.STATE.CANCELLED;
      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.CANCELLED, {
          message: `bce-sdk:super-upload super upload cancelled.`,
          data: response
        });
      }
      debug('[cancel] Multipart upload cancelled, <abortMultipartUpload> --->: %O', response);
      return true;
    } catch (error) {
      this.state = Enums.STATE.FAILED;
      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.FAILED, {
          message: `bce-sdk:super-upload super upload cancel failed: ${error.message}`,
          data: null
        });
      }
      debug('[cancel] Multipart upload cancel failed, error: %O', error);
      return false;
    }
  }

  /**
   * 结束任务
   */
  async __complete() {
    const client = this.client;
    const bucketName = this.bucketName;
    const objectName = this.objectName;
    const uploadId = this.uploadId;
    const ContentLength = this.ContentLength;
    const uploadedParts = this.__uploadedParts;
    const uploadedBytes = this.__uploadedBytes;
    const exceptionParts = this.__exceptionParts;

    if (!uploadId) {
      this.state = Enums.STATE.FAILED;
      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.FAILED, {
          message: 'bce-sdk:super-upload super upload complete failed: uploadId not found.',
          data: null
        });
      }
      debug('[__complete] uploadId not found.');
      return false;
    }

    if (uploadedParts.length === 0) {
      this.state = Enums.STATE.FAILED;
      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.FAILED, {
          message: `bce-sdk:super-upload super upload complete failed: uploaded parts is empty.`,
          data: null
        });
      }
      debug('[__complete] uploaded parts is empty.');
      return false;
    }

    // 已上传内容 < 文件总大小，说明有部分分片没有上传完成,  重试3次后如果还失败，则抛出异常
    if (uploadedBytes !== ContentLength && exceptionParts.length > 0) {
      debug('[__complete] uploaded bytes is less than ContentLength, start to retry exception parts.');

      if (this.__retryTimes < 3) {
        this.__queue.push(exceptionParts);
        this.__retryTimes += 1;
        this.__exceptionParts = [];
        return;
      } else {
        this.state = Enums.STATE.FAILED;
        const onStateChange = this.onStateChange;
        if (onStateChange) {
          onStateChange(Enums.STATE.FAILED, {
            message: `bce-sdk:super-upload super upload complete failed: exceed the max retry times (3).`,
            data: {
              exceptionParts
            }
          });
        }
        debug(
          '[__complete] Multipart upload completed failed: exceed the max retry times (3). here is a list of exception part: %O',
          exceptionParts
        );
        return false;
      }
    }

    // PartNumber要求必须严格有序
    let sortedParts = sortBy(uploadedParts, (part) => part.partNumber);

    try {
      debug('[__complete] Multipart upload finished, start to complete.');
      const response = await client.completeMultipartUpload(bucketName, objectName, uploadId, sortedParts);

      this.state = Enums.STATE.COMPLETED;
      // 结束进度
      this.__emitProgress({
        speed: mean(this.__speeds),
        progress: 1,
        uploadedBytes: this.ContentLength
      });

      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.COMPLETED, {
          message: `bce-sdk:super-upload super upload completed`,
          data: response.body
        });
      }

      debug('[__complete] Multipart upload completed, <completeMultipartUpload> --->: %O', response.body);

      return response.body;
    } catch (error) {
      this.state = Enums.STATE.FAILED;
      const onStateChange = this.onStateChange;
      if (onStateChange) {
        onStateChange(Enums.STATE.FAILED, {
          message: `bce-sdk:super-upload super upload complete failed: ${error.message}`,
          data: null
        });
      }
      debug('[__complete] Multipart upload completed failed: %s', error.message);
      return false;
    }
  }

  isRunning() {
    return this.state === Enums.STATE.RUNNING;
  }

  isPaused() {
    return this.__queue.paused && this.state === Enums.STATE.PAUSED;
  }

  isCancelled() {
    return this.state === Enums.STATE.CANCELLED;
  }

  isCompleted() {
    return this.state === Enums.STATE.COMPLETED;
  }

  isFailed() {
    return this.state === Enums.STATE.FAILED;
  }

  /**
   * 获取全量的已上传分片列表，如果uploadId不存在则返回错误
   */
  async __listExistedParts() {
    const client = this.client;
    const bucketName = this.bucketName;
    const objectName = this.objectName;
    const uploadId = this.uploadId;
    /** 已经上传的分片数 */
    let uploadedBytes = 0;
    /** 最近一次的分片编号 */
    let nextPartNumberMarker = 0;
    /** 是否本次返回的List Part结果列表被截断, true表示本次没有返回全部结果； false表示本次已经返回了全部结果 */
    let isTruncated = true;
    /** 分片任务创建时间 */
    let createTime = '';
    /** 错误信息 */
    let error = null;
    /** 已上传分片任务集合 */
    const parts = [];

    while (isTruncated) {
      let tempBytes = uploadedBytes;
      let tempPartNumber = nextPartNumberMarker;

      try {
        const response = await client.listParts(
          bucketName,
          objectName,
          uploadId,
          tempPartNumber === -1 ? {} : {partNumberMarker: tempPartNumber}
        );

        debug('[__listExistedParts] <listParts> --->: %O', omit(response.body, ['parts']));

        tempPartNumber = response.body.nextPartNumberMarker;
        isTruncated = response.body.isTruncated;

        if (createTime === '') {
          createTime = response.body.initiated;
        }

        response.body.parts.forEach((part) => {
          const formatSize = parseInt(part.size, 10);
          const partSize = isNaN(formatSize) ? 0 : formatSize;

          tempBytes += partSize;
          parts.push(part);
        });
      } catch (err) {
        isTruncated = false;
        error = err;
      }

      uploadedBytes += tempBytes;
      nextPartNumberMarker = tempPartNumber;
    }

    return {parts, uploadedBytes, createTime, nextPartNum: nextPartNumberMarker + 1, error};
  }

  /**
   * 对未上传完成的部分进行切片
   * 分片数量: 1 (MIN_UPLOAD_PART_COUNT) - 10000 (MAX_UPLOAD_PART_COUNT)
   * 分片大小: 除最后一个分片外，单个分片最小支持 100 KB (MIN_UPLOAD_PART_SIZE)，最大支持 5 GB (MAX_UPLOAD_PART_SIZE)，且整个 Object 大小不超过 48.8 TB (MAX_UPLOAD_FILE_SIZE)。
   * 分片大小可以不一样, 所以每次初始化任务时需要对未上传部分进行重新分片
   *
   * @param {String} uploadId 上传任务ID
   * @param {Number} uploadedBytes 已上传字节数
   * @param {Number} uploadedPartCount 已上传分片数量
   * @param {Number} nextPartNum 下一个未上传的分片序号
   */
  __getMicroTasks(uploadId, uploadedBytes, uploadedPartCount, nextPartNum) {
    const bucketName = this.bucketName;
    const objectName = this.objectName;
    const ContentLength = this.ContentLength;
    const data = this.data;
    const isFresh = uploadedPartCount === 0;

    // 待上传总体积
    let remainSize = ContentLength - uploadedBytes;
    // 待上传起始字节
    let offset = uploadedBytes;
    // 待上传分片序号
    let partNumber = isFresh ? 1 : nextPartNum;
    // 分片大小
    const chunkSize = this.__calculatePartSize(remainSize, uploadedPartCount);
    debug('[__getMicroTasks] chunkSize: %d', chunkSize);
    const microTasks = [];

    while (remainSize > 0) {
      const partSize = Math.min(remainSize, chunkSize);

      const microTask = {
        data,
        uploadId,
        bucketName,
        objectName,
        partNumber,
        partSize,
        start: offset,
        end: offset + partSize - 1
      };

      microTasks.push(microTask);

      remainSize -= partSize;
      offset += partSize;
      partNumber += 1;
    }

    return microTasks;
  }

  /**
   * 动态调整分片大小，如果剩余文件按照当前partSize分片超出分片数量上限，则动态增加partSize
   *
   * @param {Number} remainSize 文件剩余大小
   * @param {Number} uploadedPartCount 已经上传的分片数量
   */
  __calculatePartSize(remainSize, uploadedPartCount) {
    // 默认分片大小
    let partSize = this.chunkSize;
    let isPartSizeAvailable = Math.ceil(remainSize / partSize) + uploadedPartCount <= MAX_UPLOAD_PART_COUNT;

    while (!isPartSizeAvailable) {
      partSize += this.chunkSize;

      isPartSizeAvailable = Math.ceil(remainSize / partSize) + uploadedPartCount <= MAX_UPLOAD_PART_COUNT;
    }

    return partSize;
  }

  /**
   * 上传文件分片
   */
  __uploadPart() {
    const context = this;
    const client = this.client;
    const bucketName = this.bucketName;
    const objectName = this.objectName;
    const dataType = this.__dataType;

    return function (task, callback) {
      const {start, partSize, partNumber, uploadId} = task;
      let resPromise;
      let startTime = performance.now();

      // 任务取消就不执行运行中的分片任务了
      if (context.isCancelled()) {
        return;
      }

      // 任务暂停，重新推入队列中，等待resume后重新执行
      if (context.isPaused()) {
        this.__queue.push(task);
        callback();
        return;
      }

      if (dataType === Enums.DATATYPE.File) {
        resPromise = client.uploadPartFromFile(
          bucketName,
          objectName,
          uploadId,
          partNumber,
          partSize,
          task.data,
          start,
          {
            [H.CONTENT_LENGTH]: partSize
          }
        );
      } else if (dataType === Enums.DATATYPE.Buffer) {
        const dataURL = task.data.slice(task.start, task.end + 1).toString('base64');

        resPromise = client.uploadPartFromDataUrl(bucketName, objectName, uploadId, partNumber, partSize, dataURL, {
          [H.CONTENT_LENGTH]: partSize
        });
      } else if (dataType === Enums.DATATYPE.Blob) {
        const blob = task.data.slice(task.start, task.end + 1);

        resPromise = client.uploadPartFromBlob(bucketName, objectName, uploadId, partNumber, partSize, blob, {
          [H.CONTENT_LENGTH]: partSize
        });
      }

      return resPromise
        .then((response) => {
          debug('[__uploadPart] success: [%d] [%s]', task.partNumber, response.http_headers.etag);

          // 分片结束时间
          let endTime = performance.now();
          // 分片上传时间，单位s
          let partElapsedTime = (endTime - startTime) / 1000;
          // 分片上传速度，单位bytes/s
          let speed = partElapsedTime === 0 ? 0 : partSize / partElapsedTime;
          // 已上传的字节数
          context.__uploadedBytes += partSize;
          // 已上传分片
          context.__uploadedParts.push({
            partNumber,
            partSize,
            eTag: response.http_headers.etag
          });
          // 平均上传速度
          context.__speeds.push(speed);
          // 派发进度
          context.__emitProgress({
            speed: mean(context.__speeds),
            progress: context.__uploadedBytes / context.ContentLength,
            uploadedBytes: context.__uploadedBytes,
            totalBytes: context.ContentLength
          });

          callback();
        })
        .catch((error) => {
          // 任务取消就不执行运行中的分片任务了
          if (context.isCancelled()) {
            return;
          }

          debug('[__uploadPart] failed: [%d], error: %O', task.partNumber, error);

          // 分片结束时间
          let endTime = performance.now();
          // 分片上传时间，单位s
          let partElapsedTime = (endTime - startTime) / 1000;
          // 分片上传速度，单位bytes/s
          let speed = partElapsedTime === 0 ? 0 : partSize / partElapsedTime;
          // 平均上传速度
          context.__speeds.push(speed);
          // 派发进度
          context.__emitProgress({
            speed: mean(context.__speeds),
            progress: context.__uploadedBytes / context.ContentLength,
            uploadedBytes: context.__uploadedBytes,
            totalBytes: context.ContentLength
          });

          // 记录异常任务，队列清空后，重新上传异常任务
          context.__exceptionParts.push(task);

          callback();
        });
    };
  }

  /**
   *
   * @param {Object} params 参数
   * @param {number} params.speed 当前上传速度
   * @param {number} params.progress 当前上传进度
   * @param {number} params.uploadedBytes 已上传字节数
   * @param {number} params.totalBytes 文件总字节数
   */
  __emitProgress(params) {
    const onProgess = this.onProgress;
    const normalizedParams = {
      speed: `${filesize(params.speed, {base: 2, standard: 'jedec'})}/s`,
      progress: parseFloat(params.progress.toFixed(4)),
      percent: (params.progress * 100).toFixed(2) + '%',
      uploadedBytes: params.uploadedBytes,
      totalBytes: this.ContentLength
    };

    debug('[progress] %O', normalizedParams);

    if (!onProgess) {
      return;
    }

    onProgess(normalizedParams);
  }
}

module.exports = SuperUpload;

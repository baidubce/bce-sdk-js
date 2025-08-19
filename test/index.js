const BosClient = require('../').BosClient;
const MimeType = require('../').MimeType;
const config = require('./config');
const client = new BosClient(config['bos_qa']);
const path = require('path');
const fs = require('fs');

(async function () {
  const bucketName = 'bucket-name-demo';
  const objectName = 'demo.tgz';
  const data = '/Mock/path/to/local/file/demo.tgz';

  // 初始化上传任务
  const SuperUploadTask = client.putSuperObject({
    // 桶名称
    bucketName,
    // 上传后对象名称
    objectName,
    // 上传数据, 类型为string时表示文件路径
    data,
    // 分片并发数
    partConcurrency: 2,
    // 上传进度回调函数
    onProgress: (options) => {
      const {speed, progress, percent, uploadedBytes, totalBytes} = options;
      console.log(options);
    },
    // 状态变化回调函数
    onStateChange: (state, data) => {
      if (state === 'completed') {
        console.log('上传成功');
      } else if (state === 'failed') {
        console.error('上传失败，失败原因：' + data.message);
      } else if (state === 'cancelled') {
        console.log('上传任务取消');
      } else if (state === 'inited') {
        console.log('上传任务初始化完成');
      } else if (state === 'running') {
        console.log('上传任务开始运行...');
      } else if (state === 'paused') {
        console.log('上传任务已暂停');
      }
    }
  });

  // 启动上传任务
  const tasks = SuperUploadTask.start();
  console.log('切分任务: ', tasks);

  // 暂停上传任务
  setTimeout(() => {
    SuperUploadTask.pause();
  }, 5000);

  // 恢复上传任务
  setTimeout(() => {
    SuperUploadTask.resume();
  }, 15000);

  // 取消上传任务
  setTimeout(async () => {
    const result = SuperUploadTask.cancel();
    console.log(result ? '任务取消成功' : '任务取消失败');
  }, 25000);
})();

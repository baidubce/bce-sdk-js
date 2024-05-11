/**
 * client publisher: 发布程序到BOS上
 *
 * @file bosPubliser.js
 * @author mudio(job.mudio@gmail.com)
 */

/* eslint-disable max-len, no-console */

const path = require('path');
const fsWalk = require('@nodelib/fs.walk');
const {BosClient} = require('../');

const {version, name} = require('../package.json');

const {BOS_AK_CDN, BOS_SK_CDN} = process.env;
const client = new BosClient({
  endpoint: 'https://bj.bcebos.com',
  credentials: {ak: BOS_AK_CDN, sk: BOS_SK_CDN}
});
const bucketName = 'bce-cdn';

function uploadTo(bucketName, objectName, filePath) {
  client.getObjectMetadata(bucketName, objectName).then(
    () => console.log(`取消，已经存在 => ${objectName}`),
    (err) => {
      if (err.status_code === 404) {
        client.putObjectFromFile(bucketName, objectName, filePath).then(
          () => console.log(`上传完毕 => ${objectName}`),
          (ex) => console.error(ex.message)
        );
      } else {
        console.error(err.message);
      }
    }
  );
}

function publish(distDir) {
  const files = fsWalk.walkSync(distDir);

  files.forEach((file) => {
    const objectName = path.join('lib', name, version, file.name);

    uploadTo(bucketName, objectName, file.path);
  });
}

if (BOS_AK_CDN && BOS_SK_CDN) {
  const distDir = path.join(__dirname, '..', 'dist');
  publish(distDir);
} else {
  console.log('终止发布操作，请配置环境变量BOS_AK、BOS_SK。');
}

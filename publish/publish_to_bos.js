/**
 * client publisher: 发布程序到BOS上
 *
 * @file bosPubliser.js
 * @author mudio(job.mudio@gmail.com)
 */

/* eslint-disable max-len, no-console */

const path = require('path');
const walk = require('fs-walk');
const {BosClient} = require('../');

const {version, name} = require('../package.json');

const {BOS_AK, BOS_SK} = process.env;
const client = new BosClient({
    endpoint: 'https://bj.bcebos.com',
    credentials: {ak: BOS_AK, sk: BOS_SK}
});

function uploadTo(bucketName, objectName, filePath) {
    client.getObjectMetadata(bucketName, objectName).then(
        () => console.log(`取消，已经存在 => ${objectName}`),
        err => {
            if (err.status_code === 404) {
                client.putObjectFromFile(bucketName, objectName, filePath).then(
                    () => console.log(`上传完毕 => ${objectName}`),
                    ex => console.error(ex.message)
                );
            } else {
                console.error(err.message);
            }
        }
    );
}

function publish(distDir) {
    walk.files(distDir, (basedir, filename) => {
        const bucketName = 'bce-cdn';
        const objectName = path.join('lib', name, version, filename);
        uploadTo(bucketName, objectName, path.join(distDir, filename));
    },
    err => console.log(err.message));
}

if (BOS_AK && BOS_SK) {
    publish(path.join(__dirname, '..', 'dist'));
} else {
    console.log('终止发布操作，请配置环境变量BOS_AK、BOS_SK。');
}

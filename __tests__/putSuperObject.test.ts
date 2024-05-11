import {BosClient, Auth, Q, STS, MimeType} from '../index';

const bosConfig = (globalThis as any).__config__.bos;
const stsConfig = (globalThis as any).__config__.sts;
const bucket: string = bosConfig.bucket;

describe('putSuperObject', () => {
  const stsClient = new STS({
    protocol: 'https',
    region: 'bj',
    endpoint: stsConfig.endpoint,
    credentials: {
      ak: stsConfig.ak,
      sk: stsConfig.sk
    }
  });
  const objectName = 'test.tgz';
  const localFile = '/path/to/localFile';

  test('listObjects by session token', async () => {
    const {
      body: {accessKeyId: tempAK, secretAccessKey: tempSK, sessionToken: sessionToken}
    } = await stsClient.getSessionToken(6000, {
      accessControlList: [
        {
          service: 'bce:bos',
          resource: [bucket],
          region: '*',
          effect: 'Allow',
          permission: ['LIST']
        }
      ]
    });
    const bosClient = new BosClient({
      protocol: 'https',
      endpoint: bosConfig.endpoint,
      credentials: {
        ak: tempAK,
        sk: tempSK
      },
      sessionToken
    });
    const res = await bosClient.listObjects(bucket);
    expect(Array.isArray(res?.body?.contents)).toBeTruthy();
  });

  test('listObjects by expired session token', async () => {
    jest.useRealTimers();
    const durationInSeconds = 3;
    const {
      body: {accessKeyId: tempAK, secretAccessKey: tempSK, sessionToken: sessionToken, createTime, expiration}
    } = await stsClient.getSessionToken(durationInSeconds, {
      accessControlList: [
        {
          service: 'bce:bos',
          resource: [bucket],
          region: '*',
          effect: 'Allow',
          permission: ['LIST']
        }
      ]
    });
    const bosClient = new BosClient({
      protocol: 'https',
      endpoint: bosConfig.endpoint,
      credentials: {
        ak: tempAK,
        sk: tempSK
      },
      sessionToken
    });

    // 等待4s
    await new Promise((resolve) => setTimeout(resolve, (durationInSeconds + 1) * 1000));

    const expTime = new Date(expiration);
    const now = new Date();
    // 当前时间超出expiration时间
    expect(now.getTime()).toBeGreaterThan(expTime.getTime());

    let res: any;

    try {
      res = await bosClient.listObjects(bucket);
    } catch (error) {
      res = error;
    }

    // session token不合法抛出异常
    expect(res?.status_code).toEqual(400);
    expect(res?.code).toEqual('InvalidSessionToken');
  });

  test(
    'pubSuperObject process with pause, resume and cancel',
    async () => {
      const bosClient = new BosClient({
        protocol: 'https',
        endpoint: bosConfig.endpoint,
        credentials: {
          ak: bosConfig.ak,
          sk: bosConfig.sk
        }
      });
      const superUpload = (bosClient as any).putSuperObject({
        bucketName: bucket,
        objectName,
        data: localFile,
        partConcurrency: 3,
        onProgress: (options: any) => {
          // const {speed, progress, percent, uploadedBytes, totalBytes} = options;
          console.log('onProgress: ', options);
        },
        // 状态变化回调函数
        onStateChange: (state: string, data: any) => {
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

      const tasks = await superUpload.start();
      expect(tasks.length).toBeGreaterThan(0);

      // 等待5s后暂停
      await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
      superUpload.pause();
      expect(superUpload.state).toEqual('paused');

      // 等待3s后恢复
      await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
      superUpload.resume();
      expect(superUpload.state).toEqual('running');

      // 等待10s后取消任务
      await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
      await superUpload.cancel();
      expect(superUpload.state).toEqual('cancelled');
    },
    10 * 60 * 1000
  );

  async function getAKSK(durationInSeconds: number) {
    const {body} = await stsClient.getSessionToken(durationInSeconds, {
      accessControlList: [
        {
          service: 'bce:bos',
          /**
           * bucket 代表操作对象是bucket
           * bucket/* 代表操作对象是所有object
           */
          resource: [bucket, `${bucket}/*`],
          region: '*',
          effect: 'Allow',
          permission: ['READ', 'WRITE', 'LIST']
        }
      ]
    });

    return {
      ak: body.accessKeyId,
      sk: body.secretAccessKey,
      sessionToken: body.sessionToken,
      expiration: body.expiration
    };
  }

  test('initiateMultipartUpload with temp ak & sk', async () => {
    const {ak, sk, sessionToken} = await getAKSK(6000);
    const bosClient = new BosClient({
      protocol: 'https',
      endpoint: bosConfig.endpoint,
      credentials: {ak, sk},
      sessionToken
    });
    const res = await bosClient.initiateMultipartUpload(bucket, 'test.tgz');
    expect(res?.body?.uploadId).toBeTruthy();
  });

  test.only(
    'putSuperObject with custom createSignature',
    async () => {
      jest.useRealTimers();
      let count = 0;
      // sessionToken的有效期
      const durationInSeconds = 5;
      let {
        ak: tempAK,
        sk: tempSK,
        sessionToken: tmpSessionToken,
        expiration: expiredUTCTime
      } = await getAKSK(durationInSeconds);
      const bosClient = new BosClient({
        protocol: 'https',
        endpoint: bosConfig.endpoint,
        credentials: {
          ak: tempAK,
          sk: tempSK
        },
        sessionToken: tmpSessionToken,
        // 自定义签名
        createSignature: async function (
          credentials: {ak: string; sk: string},
          httpMethod: string,
          path: string,
          params: Record<string, any>,
          headers: Record<string, any>,
          context: any
        ) {
          let upatedAK = credentials.ak;
          let upatedSK = credentials.sk;
          const now = new Date();

          // 将当前的秒数向上取整，因为getSessionToken接口返回的expiration不带毫秒数
          if (now.getUTCMilliseconds() > 0) {
            // 如果有毫秒，则增加一秒并设置毫秒为0
            now.setUTCSeconds(now.getUTCSeconds() + 1, 0);
          }

          // 如果当前时间大于过期时间，则重新获取临时密钥
          if (now >= new Date(expiredUTCTime)) {
            const tempRes = await getAKSK(durationInSeconds);

            upatedAK = tempRes.ak;
            upatedSK = tempRes.sk;
            expiredUTCTime = tempRes.expiration;
            tmpSessionToken = tempRes.sessionToken;

            // 更新全局config信息
            context.updateConfigByPath('credentials.ak', upatedAK);
            context.updateConfigByPath('credentials.sk', upatedSK);
            context.updateConfigByPath('sessionToken', tmpSessionToken);

            // 更新session Token
            headers['x-bce-security-token'] = tmpSessionToken;
            count++;
          } else {
            // 更新session Token
            headers['x-bce-security-token'] = tmpSessionToken;
          }

          const revisionTimestamp = Date.now() + (context?.timeOffset || 0);
          headers['x-bce-date'] = new Date(revisionTimestamp).toISOString().replace(/\.\d+Z$/, 'Z');

          return Q.fcall(function () {
            var auth = new Auth(upatedAK, upatedSK);
            return auth.generateAuthorization(httpMethod, path, params, headers, revisionTimestamp / 1000);
          });
        }
      });
      const superUpload = (bosClient as any).putSuperObject({
        bucketName: bucket,
        objectName,
        data: localFile,
        partConcurrency: 2,
        onStateChange: (state: string, data: any) => {
          if (state === 'failed') {
            console.error('上传失败，失败原因：' + data.message);
          } else if (state === 'cancelled') {
            console.log('上传任务取消');
          } else if (state === 'inited') {
            console.log('上传任务初始化完成');
          } else if (state === 'running') {
            console.log('上传任务开始运行...');
          }
        }
      });

      const tasks = await superUpload.start();
      expect(tasks.length).toBeGreaterThan(0);

      // 等待上传一段时间
      await new Promise((resolve) => setTimeout(resolve, 20 * 1000));

      // 取消成功
      await superUpload.cancel();
      expect(superUpload.state).toEqual('cancelled');
      expect(count).toBeGreaterThanOrEqual(1);
    },
    10 * 60 * 1000
  );
});

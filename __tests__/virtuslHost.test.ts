import {BosClient, Auth, Q, STS, MimeType} from '../index';
const defautlBosConfig = (globalThis as any).__config__.bos;
const bosConfig = {
    endpoint: 'https://bj.bcebos.com',
    credentials: defautlBosConfig.credentials,
    bucket: 'wcc-chengdu',
    region1: 'cd',
    bucket2: 'wcc-wuhan',
    region2: 'fwh',
}

const configList = [
    {
        // path_style
        endpoint: 'http://001-obs.bj.bcebos.com',
        cname_enabled: true,
    },
    {
        endpoint: 'http://001-obs.bj.bcebos.com',
        cname_enabled: false,
    },
    {
        // cdn domain
        endpoint: 'http://001-obs.cdn.bcebos.com',
        cname_enabled: true,
    },
    {
        // ip
        endpoint: 'http://10.181.134.29:8080',
        cname_enabled: false,
    },
    {
        // official_bos_domain
        endpoint: 'http://bj.bcebos.com',
        cname_enabled: false,
        pathStyleEnable: true
    },
    {
        // official_bos_domain
        endpoint: 'http://bj.bcebos.com',
        cname_enabled: false,
        pathStyleEnable: false
    },

]

const testApi = {
    serviceAPI: ['listBuckets'],
    getBucketAPI: Object.keys(BosClient.prototype).filter(item => item.includes('getBucket') || (item === 'listObjects')),
    objectAPI: ['generatePresignedUrl']
}

const bucket: string = bosConfig.bucket;
const bucket2: string = bosConfig.bucket2;
const region: string = bosConfig.region1;
const region2: string = bosConfig.region2;

describe('serviceAPI', () => {
    test.each(configList)('listBuckets-$endpoint', async (config) => {
        const bosClient = new BosClient({
            protocol: 'https',
            credentials: bosConfig.credentials,
            ...config,
        });
        let res;
        try {
            res = await bosClient.listBuckets();
        } catch (error) {
            res = error;
        }
        // 正常返回
        expect(res.body).toBeDefined();
    })
});

describe('bucketAPI', () => {
    const bosClient = new BosClient({
        protocol: 'https',
        credentials: bosConfig.credentials,
        endpoint: bosConfig.endpoint
    });

    test('getBucketStorageclass switch region', async () => {
        let res;
        try {
            res = await bosClient.getBucketStorageclass(bucket);
        } catch (error) {
            res = error;
        }
        expect(res?.message).toEqual(expect.stringContaining('The specified bucket does not exist.'));
    
        try {
            res = await bosClient.getBucketStorageclass(bucket, {config: {region}});
        } catch (error) {
            res = error;
        }
        // 正常返回
        expect(res.body).toBeDefined();
    })

    /** 以下写法bosClient[api]报错，原因不明*/
    /** 
    test.each(testApi.getBucketAPI)('bucketAPI-%s', async (api) => {
        let res;
        try {
            res = await bosClient[api](bucket);
        } catch (error) {
            res = error;
        }
        expect(res.body).toBeDefined();
        expect(res?.message).not.stringContaining('The specified bucket does not exist.');
    })
    */
});
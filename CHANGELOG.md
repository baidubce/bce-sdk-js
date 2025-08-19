# CHANGELOG

## 1.0.7 (latest)

_published on 2025-06-23_

- fix:
  - `deleteObject` request args not passing `versionId`

## 1.0.6

_published on 2025-06-20_

- feat:

  - add `listObjectVersions`、`getBucketVersioning`、`putBucketVersioning`、`_headBucket` APIs
  - support versioning related APIs: `getObject`、`getObjectMetadata`、`deleteObject`、`deleteMultipleObjects`、`copyObject`
  - support `'x-bce-version-id'` header

- fix:

  - `putSuperObject` paused task without immediately canceling request;

- chore:
  - add `x-bce-debug-id` in error response body;

## 1.0.5-beta.3

_published on 2025-05-27_

- fix:
  - `putSuperObject` paused task without immediately canceling request;

## 1.0.5-beta.2

_published on 2025-05-27_

- chore:
  - add `x-bce-debug-id` in error response body;

## 1.0.4

_published on 2025-05-20_

- fix:
  - Fix the logic error of mandatory verification in the `x-bce-fetch-source` request header in the `fetchObject` API

## 1.0.3

_published on 2025-04-07_

- feat:

  - Add compliance retention related APIs
  - initBucketObjectLock support headers
  - support `proxy` configuration;

- fix:

  - Fix endpoint is mistakenly set by virtual host config
  - Allow passing headers in the ObjectLock related APIs

- chore
  - BosClient support 'x-bce-tagging' header;
  - Adjust the priority of the removeVersionPrefix parameter;
  - update mimeType to support mjs files;
  - custom gloal config endpoint mistakenly overwritten by bj endpoint;

## 1.0.3-beta.9

_published on 2025-03-24_

- fix: custom gloal config `endpoint` mistakenly overwritten by bj endpoint;

## 1.0.3-beta.8

_published on 2025-02-12_

- feat: support `proxy` configuration;

## 1.0.3-beta.7

_published on 2024-12-25_

- chore: Adjust the priority of the `removeVersionPrefix` parameter;
- chore: update mimeType to support `mjs` files;

## 1.0.3-beta.5

_published on 2024-12-02_

- Chore: BosClient support `'x-bce-tagging'` header;

## 1.0.3-beta.4

_published on 2024-10-30_

### BosClient

- Feat: initBucketObjectLock support headers

## 1.0.3-beta.3

_published on 2024-10-24_

### BosClient

- Fix: Allow passing headers in the ObjectLock related APIs

## 1.0.3-beta.2

_published on 2024-10-23_

### BosClient

- Fix endpoint is mistakenly set by virtual host config

## 1.0.3-beta.1

_published on 2024-10-22_

### BosClient

- Add compliance retention related APIs

## 1.0.2

_published on 2024-09-24_

- support global config `customGenerateUrl` to set custom endpoint.
- support `x-bce-source` header
- fix optional-chaining-assign syntax not transformed issue.

## 1.0.2-beta.2

_published on 2024-09-23_

### BosClient

- support global config `customGenerateUrl` to set custom endpoint.

## 1.0.2-beta.0 & ## 1.0.2-beta.1

_published on 2024-09-03_

## 1.0.1

_published on 2024-07-16_

### BosClient

- `putSuperObject` API (encapsulation for mutipart upload)
- `getBucketStorageclass` API
- Support the `createSignature` method in `BceConfig` for customizing the generation of authentication signatures (Authorization)."
- support virtual host mode.

### BceClient

- support `region` and `customGenerateUrl` to change endpoint.

## 1.0.1-beta.9

_published on 2024-07-09_

- BceClient: support `region` and `customGenerateUrl` to change endpoint.

## 1.0.1-beta.7 & 1.0.1-beta.8

_published on 2024-06-26_

- BceClient: fix `net.isIP` not worked in browser envrioment.

## 1.0.1-beta.6

_published on 2024-05-14_

- BosClient: support virtual host mode.

## 1.0.1-beta.4

_published on 2024-05-07_

- BosClient: Support the `createSignature` method in `BceConfig` for customizing the generation of authentication signatures (Authorization)."

## 1.0.1-beta.3

- patch `process` package to dependencies

## 1.0.1-beta.2

- BosClient: add `putSuperObject` API (encapsulation for mutipart upload)

## 1.0.1-beta.1

_published on 2024-01-08_

- BosClient: requestInstance use `_req.abort()` in Node.js env.

## 1.0.0-rc.42

_published on 2023-10-26_

- BosClient: support callback parameter in options;

Approach 1:

> Use the callback parameter, the SDK will help you process the parameter and add it to the request header.

```javascript
try {
  const res = await client.putObjectFromString('bucketName', 'fileName', 'demo-string', {
    callback: {
      urls: ['https://www.test.com/callback'],
      vars: {name: 'baidu'},
      encrypt: 'config',
      key: 'callback1'
    }
  });

  /* callback result */
  console.log(res.body.callback.result);
} catch (e) {
  /* callback error code */
  console.error(res.body.callback.code);
  /* callback error message */
  console.error(res.body.callback.message);
}
```

Approach 2:

> Directly pass the "x-bce-process" parameter to headers.

```javascript
try {
  const res = await client.putObjectFromString('bucketName', 'fileName', 'demo-string', {
    'x-bce-process': 'callback/callback,u_WyJodHRwczovL3d3dy50ZXN0LmNvbS9jYWxsYmFjayJd,m_sync,v_eyJuYW1lIjoiYmFpZHUifQ'
  });

  /* callback result */
  console.log(res.body.callback.result);
} catch (e) {
  /* callback error code */
  console.error(res.body.callback.code);
  /* callback error message */
  console.error(res.body.callback.message);
}
```

## 1.0.1-beta.0

_published on 2023-11-29_

- BosClient: support `requestInstance` to manipulate request cancellation.

## 1.0.0-rc.41

_published on 2023-10-26_

- BosClient: support 'x-bce-process' in headers;
- BosClient: add createFolderShareUrl method for sharing links;

## 1.0.0-rc.40

_published on 2023-06-19_

- BosClient: 'x-bce-security-token' considered in auth token.

## 1.0.0-rc.39

_published on 2023-06-16_

- BosClient: Add 'x-bce-security-token' when using generatePresignedUrl with sessionToken;

## 1.0.0-rc.38

_published on 2023-02-16_

- BosClient: support symlink;

## 1.0.0-rc.37

_published on 2023-01-09_

- BosClient: support 'x-bce-server-side-encryption', 'x-bce-restore-days', 'x-bce-restore-tier' headers;

## 1.0.0-rc.36

_published on 2022-05-06_

- BOSClient: fix getObject stream.store

## 1.0.0-rc.35

_published on 2022-05-05_

- BOSClient: Just keep an array of all of buffers and concat at the end.

## 1.0.0-rc.34

_published on 2021-12-15_

- BOSClient: Provide cname_enabled field when using a custom domain name to delete bucketName path.

## 1.0.0-rc.33

_published on 2021-11-26_

- TsdbDataClient: support database parameter.
- BOSClient: fix the browser environment reference entry.

## 1.0.0-rc.32

_published on 2021-10-22_

- BOSClient: fix the browser environment reference entry.

## 1.0.0-rc.31

_published on 2021-08-13_

- BOSClient: add key valiation in getObject() & getObjectToFile() method;
  - empty key is not allowed
  - consecutive forward slashes (/) are not allowed in key
  - forward slash (/) and a backslash (\\) are not allowed at head or tail
  - consecutive periods (..) are not allowed in sub-path

## 1.0.0-rc.30

_published on 2021-08-03_

- BOSClient: fix issue of lack of '/' prefix of object url;

## 1.0.0-rc.29

_published on 2021-08-03_

- BOSClient: support "config.removeVersionPrefix"(boolean) parameter to dynamic control 'v1' prefix of resource in generatePresignedUrl, generateUrl;

## 1.0.0-rc.28

_published on 2021-03-26_

- Fix entry file path for browser environment

## 1.0.0-rc.27

_published on 2021-03-03_

- CFCClient supports trigger API

## 1.0.0-rc.26

_published on 2020-12-23_

- BOSClient supports putBucketStorageclass API
- BOSClient supports putBucketAcl API

## 1.0.0-rc.25

_published on 2020-09-01_

- BOSClient supports `x-bce-storage-class` header

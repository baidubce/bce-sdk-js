# CHANGELOG

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

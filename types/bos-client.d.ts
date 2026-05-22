/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file bos-client.d.ts
 * @module src/bos_client.js
 * @description BOS服务声明文件
 */

/// <reference path="base.d.ts" />
/// <reference path="http-client.d.ts" />

declare namespace BaiduBCE {
  type ReadStream = import('fs').ReadStream;
  type ClientRequest = import('http').ClientRequest;

  /*****************************************************************************************
   *                            BOS 枚举与字面量类型
   ****************************************************************************************/
  /** BOS 存储桶 Canned ACL 类型 */
  type BOSCannedACLType = 'private' | 'public-read' | 'public-read-write';

  /** BOS Object Canned ACL 类型 */
  type BOSObjectCannedACLType = 'private' | 'public-read' | 'public-read-write';

  /** BOS 归档对象取回优先级 */
  type BOSRestoreTierType = 'Expedited' | 'Standard' | 'LowCost';

  /** BOS 存储类型（全量） */
  type BOSStorageClassType = 'STANDARD' | 'STANDARD_IA' | 'COLD' | 'ARCHIVE' | 'MAZ_STANDARD' | 'MAZ_STANDARD_IA';

  /** BOS Bucket 版本管理状态 */
  type BucketVersionStateType = 'enabled' | 'notEnabled' | 'suspended';

  /** Bucket 级别细粒度权限（节选客户端用到的部分） */
  const enum BucketPermission {
    FULL_CONTROL = 'FULL_CONTROL',
    READ = 'READ',
    WRITE = 'WRITE',
    LIST = 'LIST',
    MODIFY = 'MODIFY',
    ListBucket = 'ListBucket',
    GetBucket = 'GetBucket',
    GetBucketAcl = 'GetBucketAcl',
    PutBucketAcl = 'PutBucketAcl',
    PutBucketTagging = 'PutBucketTagging',
    GetBucketTagging = 'GetBucketTagging',
    PutBucketStorageClass = 'PutBucketStorageClass',
    GetBucketStorageClass = 'GetBucketStorageClass',
    PutBucketVersioning = 'PutBucketVersioning',
    GetBucketVersioning = 'GetBucketVersioning',
    GetObjectVersion = 'GetObjectVersion',
    DeleteObjectVersion = 'DeleteObjectVersion',
    ListObjectVersions = 'ListObjectVersions',
    PutObjectVersionAcl = 'PutObjectVersionAcl',
    GetObjectVersionAcl = 'GetObjectVersionAcl'
  }

  /** Object 级别细粒度权限 */
  const enum ObjectPermission {
    FULL_CONTROL = 'FULL_CONTROL',
    READ = 'READ',
    WRITE = 'WRITE',
    GetObject = 'GetObject',
    PutObject = 'PutObject',
    DeleteObject = 'DeleteObject',
    RestoreObject = 'RestoreObject',
    RenameObject = 'RenameObject',
    ListParts = 'ListParts',
    GetObjectAcl = 'GetObjectAcl',
    PutObjectAcl = 'PutObjectAcl'
  }

  /** BOS OpenAPI 支持的请求头 */
  const enum BOSHeaders {
    CONTENT_TYPE = 'Content-Type',
    CONTENT_LENGTH = 'Content-Length',
    CONTENT_MD5 = 'Content-MD5',
    CONTENT_ENCODING = 'Content-Encoding',
    CONTENT_DISPOSITION = 'Content-Disposition',
    ETAG = 'ETag',
    CONNECTION = 'Connection',
    HOST = 'Host',
    USER_AGENT = 'User-Agent',
    CACHE_CONTROL = 'Cache-Control',
    EXPIRES = 'Expires',
    ORIGIN = 'Origin',
    ACCESS_CONTROL_REQUEST_METHOD = 'Access-Control-Request-Method',
    ACCESS_CONTROL_REQUEST_HEADERS = 'Access-Control-Request-Headers',
    AUTHORIZATION = 'Authorization',
    X_BCE_DATE = 'x-bce-date',
    X_BCE_ACL = 'x-bce-acl',
    X_BCE_GRANT_READ = 'x-bce-grant-read',
    X_BCE_GRANT_FULL_CONTROL = 'x-bce-grant-full-control',
    X_BCE_REQUEST_ID = 'x-bce-request-id',
    X_BCE_CONTENT_SHA256 = 'x-bce-content-sha256',
    X_BCE_OBJECT_ACL = 'x-bce-object-acl',
    X_BCE_OBJECT_GRANT_READ = 'x-bce-object-grant-read',
    X_BCE_STORAGE_CLASS = 'x-bce-storage-class',
    X_BCE_SERVER_SIDE_ENCRYPTION = 'x-bce-server-side-encryption',
    X_BCE_RESTORE = 'x-bce-restore',
    X_BCE_RESTORE_DAYS = 'x-bce-restore-days',
    X_BCE_RESTORE_TIER = 'x-bce-restore-tier',
    X_BCE_SYMLINK_TARGET = 'x-bce-symlink-target',
    X_BCE_FORBID_OVERWRITE = 'x-bce-forbid-overwrite',
    X_BCE_TRAFFIC_LIMIT = 'x-bce-traffic-limit',
    X_BCE_FETCH_SOURCE = 'x-bce-fetch-source',
    X_BCE_FETCH_MODE = 'x-bce-fetch-mode',
    X_BCE_CALLBACK_ADDRESS = 'x-bce-callback-address',
    X_BCE_FETCH_REFERER = 'x-bce-fetch-referer',
    X_BCE_FETCH_USER_AGENT = 'x-bce-fetch-user-agent',
    X_BCE_PROCESS = 'x-bce-process',
    X_BCE_SOURCE = 'x-bce-source',
    X_BCE_TAGGING = 'x-bce-tagging',
    X_BCE_COPY_SOURCE = 'x-bce-copy-source',
    X_BCE_COPY_SOURCE_IF_MODIFIED_SINCE = 'x-bce-copy-source-if-modified-since',
    X_BCE_COPY_SOURCE_IF_MATCH = 'x-bce-copy-source-if-match',
    SESSION_TOKEN = 'x-bce-security-token'
  }

  /** BOS 支持传入的请求头集合（部分） */
  type BOSInternalHeaders = Partial<Record<`${BOSHeaders}`, any>>;

  /*****************************************************************************************
   *                            BOS 响应、配置类型
   ****************************************************************************************/

  /** BOS 服务统一响应类型，固定 server 标识为 `BceBos` */
  type BosResponse<TBody = any, THeader extends Record<string, any> = OpenAPIHeaders> = Promise<
    Result<TBody, OpenAPIHeaders & THeader & {server: 'BceBos'}>
  >;

  /**
   * BOS OpenAPI错误信息
   */
  export interface BOSAPIError {
    'status_code': number;
    'message': string;
    'code'?: OpenAPIErrorType;
    'request_id'?: string;
    'x-bce-date'?: string;
    'x-bce-debug-id'?: string;
  }

  /** 自定义 BOS 资源 URL 生成函数 */
  type CustomGenerateUrlFunction = (bucketName: string, region?: string, options?: {lccLocation?: string}) => string;

  /**
   * BOS 请求级配置：在通用 `RequestConfig` 基础上扩展 BOS 专属字段，
   * 用于 BosClient 各 API `options.config` 覆盖实例配置。
   */
  interface BosRequestConfig extends RequestConfig {
    /** LCC ID */
    lccLocation?: string;
    /** 自定义请求域名函数 */
    customGenerateUrl?: CustomGenerateUrlFunction;
    /** 是否移除版本前缀 */
    removeVersionPrefix?: boolean;
    /**
     * 以下字段同时存在于 `BosClientConfig` 上，运行时通过 `u.extend({}, this.config, config)`
     * 合并后可被覆盖访问。声明在此以便类型检查（如 `generateUrl` / `generatePresignedUrl`）。
     */
    cname_enabled?: boolean;
    pathStyleEnable?: boolean;
    protocol?: 'http' | 'https';
    credentials?: Credentials['credentials'];
    sessionToken?: string;
  }

  /** BOS sendRequest 入参聚合体 */
  interface BosRequestArgs {
    /** 存储桶名称 */
    bucketName?: string;
    /** 对象名称（全路径） */
    key?: string;
    /** 请求体，JSON 字符串或 Stream */
    body?: any;
    /** URL 请求参数 */
    params?: Record<string, any>;
    /** 请求头 */
    headers?: Record<string, any>;
    /** 请求局部配置 */
    config?: BosRequestConfig;
    /** 输出流 */
    outputStream?: any;
  }

  /**
   * 部分请求通过内部的 _checkOptions 构造出最终的 BosRequestArgs 传入 sendRequest，
   * 所以 API 请求的 options 参数存在两种形态：
   *   1. 直接走 sendRequest（未经过 _checkOptions）：headers / params / body 以嵌套形式给出；
   *   2. 经过 _checkOptions：BOS 支持的请求头（包含 `x-bce-meta-*` 自定义元数据）可直接打平到 options 顶层。
   *
   * 字段经源码 `_prepareObjectHeaders` / `BosClient.prototype.*` 实际读取归纳得出，
   * 不再使用宽松的字符串索引签名，便于 IDE 进行字段补全和拼写校验。
   */
  type BosClientAPIOptions = BOSInternalHeaders & {
    /** 请求级别的运行时配置覆盖（endpoint、credentials、超时、bos 专属开关等） */
    config?: BosRequestConfig;
    /** 嵌套形式的请求头；与顶层平铺写法可共存（顶层优先） */
    headers?: BOSInternalHeaders & Record<string, string | number | undefined>;
    /** 嵌套形式的查询参数（按方法定义裁剪，部分方法只接受白名单内的 key） */
    params?: Record<string, string | number | boolean | undefined>;
    /**
     * 嵌套形式的请求体；每个方法对其有不同语义：
     * 如 `putBucket` 接受 `{enableMultiAZ}`，其它方法可能传入字符串、Buffer、Stream 等。
     */
    body?: any;
    /** 对象版本 ID（versionId-aware 的 Object 操作） */
    versionId?: string;
    /** putObject 重试次数（仅 `putObject` / `putObjectFromXxx` 系列读取） */
    retryCount?: number;
    /** PostObject 表单上传时的 policy（仅 `postObject` 读取） */
    policy?: Record<string, any>;
    /** 上传/Fetch 完成后的回调配置（仅相关方法读取） */
    callback?: {
      urls: string[];
      vars?: Record<string, string>;
      encrypt?: string;
      key?: string;
    };
  } & {
    /** 用户自定义元数据，匹配 `x-bce-meta-*` 前缀的任意 key */
    [metaKey: `x-bce-meta-${string}`]: string | undefined;
  };

  /** 实例化 BosClient 参数：通用配置 + BOS 专属字段 */
  type BosClientOptions = BceClientOptions & {
    /** 是否移除路径中的版本前缀 `/v1`，历史API设计时带有该前缀 */
    removeVersionPrefix?: boolean;
    /** 自定义 BOS 资源 URL 生成函数 */
    customGenerateUrl?: CustomGenerateUrlFunction;
  };

  /** BosClient 运行时 `this.config` 的形态 */
  type BosClientConfig = BosClientOptions & {
    protocol: 'http' | 'https';
    region: string;
    pathStyleEnable?: boolean;
    /** 是否启用自定义域名（CNAME），启用后请求 URL 不再拼接 bucketName */
    cname_enabled?: boolean;
  };

  /*****************************************************************************************
   *                            BOS 通用数据结构
   ****************************************************************************************/

  /** Bucket / Object 拥有者（owner）信息 */
  interface Owner {
    /** 拥有者的用户 id */
    id: string;
    /** 拥有者的名称 */
    displayName: string;
  }

  /** ListBuckets 接口返回的 Bucket 项 */
  interface OpenAPIBucketItem {
    /** Bucket 名称 */
    name: string;
    /** Bucket 所在区域 */
    location: string;
    /** Bucket 创建时间，UTC 格式（ISO 8601，例如 `2016-04-05T10:20:35Z`） */
    creationDate: string;
    /** Bucket 数据是否多 AZ 分布；非多 AZ Bucket 不返回该属性 */
    enableMultiAz?: boolean;
    /** LCC ID，当存储桶为 LCC 类型时存在该字段。 */
    lccLocation?: string;
  }

  /**
   * ListBuckets 接口响应体。
   * @remarks 一次请求最多返回 100 个 Bucket 的信息。匿名访问时返回 `403 Forbidden / AccessDenied`。
   */
  interface ListBucketsRes {
    /** Bucket owner（拥有者）信息 */
    owner: Owner;
    /** Bucket 信息列表 */
    buckets: OpenAPIBucketItem[];
  }

  /** 查询文件列表 API 返回的对象定义 */
  interface OpenAPIObjectItem {
    /** 对象标识符 */
    eTag: string;
    /** 对象名称（全路径） */
    key: string;
    /** 最近修改时间，UTC 时间 */
    lastModified: string;
    /** Object 上传者的用户信息 */
    owner: Owner;
    /** 文件大小，单位字节 */
    size: number;
    /** 存储类型 */
    storageClass: BOSStorageClassType;
  }

  interface ListObjectOptions {
    /**
     * 分隔符，主要用此项实现 list 文件夹的逻辑。
     * 如果在请求时指定了 delimiter，BOS 会把匹配到的 Object 名称按规则截取，去重后作为 commonPrefixes 返回；
     * delimiter 长度限制为 1。
     */
    delimiter?: string;
    /** Object 为字母序排列，从 marker 之后的第一个开始返回 */
    marker?: string;
    /** 返回 object 列表长度最大为 1000 */
    maxKeys?: number;
    /** Object 前缀查询，可用于罗列以此 prefix 开头的所有文件 */
    prefix?: string;
    config?: BosRequestConfig;
  }

  interface ListObjectsRes {
    /** Bucket 名称 */
    name: string;
    delimiter: ListObjectOptions['delimiter'];
    maxKeys: ListObjectOptions['maxKeys'];
    marker: ListObjectOptions['marker'];
    /** 是否还有更多结果 */
    isTruncated: boolean;
    /** 返回的 object 列表 */
    contents: OpenAPIObjectItem[];
    /** 公共前缀，仅当指定 delimiter 才返回 */
    commonPrefixes?: Array<{prefix: string}>;
    /** 当 isTruncated true 时返回，可作为下次查询的 marker */
    nextMarker?: string;
  }

  /** ListObjectVersions 响应体（与 ListObjectsRes 同形） */
  type ListObjectVersionsRes = ListObjectsRes;

  interface BatchDeleteErrorItem {
    /** 对象全路径 */
    key: string;
    /** 错误码 */
    code: string;
    /** 错误信息 */
    message: string;
    /** 对象版本号 */
    versionId?: string;
    deleteMarker?: boolean;
    deleteMarkerVersionId?: string;
  }

  interface DeleteMultipleObjectsRes {
    errors?: BatchDeleteErrorItem[];
  }

  interface BucketReplicationData {
    id: string;
    status: 'enabled' | 'disable';
    resource: string[];
    replicateDeletes: 'enabled' | 'disable';
    destination: {bucket: string; storageClass: BOSStorageClassType};
    replicateHistory: {bucket: string; storageClass: BOSStorageClassType};
  }

  interface BucketLifecycle {
    rule: Array<{
      id: string;
      status: 'enabled' | 'disabled';
      resource: string[];
      condition: {
        time: {dateGreaterThan: string};
      };
      action: {name: BucketPermission};
      storageClass: BOSStorageClassType;
    }>;
  }

  interface BucketCorsData {
    corsConfiguration: Array<{
      allowedOrigins: string[];
      allowedMethods: Array<'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE'>;
      allowedHeaders: string[];
      allowedExposeHeaders: string[];
      maxAgeSeconds: number;
    }>;
  }

  interface Part {
    /** Part 在目的 Object 中的序号，1-10000 */
    partNumber: number;
    /** Part 的 ETag */
    eTag: string;
    /** Part 上传时间 */
    lastModified: string;
    /** Part 大小（字节） */
    size: number;
  }

  interface CompletePart {
    partNumber: number;
    eTag: string;
  }

  interface CompleteMultipartUploadRes {
    bucket: string;
    key: string;
    eTag: string;
    location: string;
  }

  interface CompleteMultipartUploadHeaders {
    'if-match'?: string;
    'if-none-match'?: string;
    'if-unmodified-since'?: string;
    'x-bce-object-expires'?: string;
  }

  interface InitiateMultipartUploadRes {
    bucket: string;
    object: string;
    uploadId: string;
  }

  interface CopyObjectRes {
    eTag: string;
    lastModified: string;
  }

  type ListPartsOptions = BosClientAPIOptions & {
    maxParts?: number;
    partNumberMarker?: number;
    uploadId?: string;
  };

  interface ListPartsRes {
    bucket: string;
    key: string;
    uploadId: string;
    initiated: string;
    owner: Owner;
    storageClass: string;
    partNumberMarker: number;
    nextPartNumberMarker: number;
    maxParts: number;
    isTruncated: boolean;
    parts: Part[];
  }

  interface GetObjectMetaHeaders extends OpenAPIHeaders {
    'content-type': string;
    'etag': string;
    'expires': string;
    'last-modified': string;
    'x-bce-storage-class': string;
    /**
     * 归档对象取回状态：
     *   - 正在取回: 'ongoing-request="true"'
     *   - 已取回: 'ongoing-request="false", expiry-date="..."'
     */
    'x-bce-restore'?: string;
    'accept-ranges'?: 'bytes' | 'none';
    'content-md5'?: string;
    'x-bce-content-crc32'?: string;
    'x-bce-content-crc32c'?: string;
    'x-bce-content-crc64ecma'?: string;
    'x-bce-server-side-encryption'?: string;
    'x-bce-meta-user-agent'?: string;
    'content-disposition'?: string;
    'cache-control'?: string;
  }

  interface CopyObjectHeaders extends OpenAPIHeaders {
    'x-bce-version-id'?: string;
  }

  interface HeadBucketHeaders extends OpenAPIHeaders {
    'x-bce-versioning': BucketVersionStateType | 'unknown';
    'x-bce-bucket-az-type': 'false' | 'true';
    'x-bce-bucket-createtime': string;
    'x-bce-bucket-dedicated': 'false' | 'true';
    'x-bce-bucket-region': string;
    'x-bce-bucket-storageclass': BOSStorageClassType;
    'x-bce-bucket-type'?: 'namespace';
    'x-bce-bucket-type-details': 'namespace-xh';
    'x-bce-lcclocation'?: string;
  }

  interface BOSACLItem<T extends BucketPermission | ObjectPermission> {
    grantee: Array<{id: string}>;
    permission: T[];
    effect?: 'Allow' | 'Deny';
    resource?: string[];
    notResource?: string[];
    condition?: Array<{
      ipAddress?: string[];
      notIpAddress?: string[];
      referer?: {
        stringLike?: string;
        stringEquals?: string;
      };
      secureTransport?: boolean;
      currentTime: {
        dateLessThan?: string;
        dateLessThanEquals?: string;
        dateGreaterThan?: string;
        dateGreaterThanEquals?: string;
      };
      userAgent?: {
        stringLike?: string;
        stringEquals?: string;
      };
    }>;
  }

  /*****************************************************************************************
   *                            BOS API 请求体 / 响应体类型（XxxReq / XxxRes）
   *
   * 命名约定：
   *   - 请求体统一以 `XxxReq` 命名（Xxx 为 API 名首字母大写）
   *   - 响应体统一以 `XxxRes` 命名
   *   - 复用其他公共结构（如 `Owner`、`Part`、`BucketLifecycle` 等）作为字段类型
   ****************************************************************************************/

  // -------- Service / Quota --------
  /** PutUserQuota 请求体 */
  interface PutUserQuotaReq {
    maxBucketCount: number;
    maxCapacityMegaBytes: number;
  }
  /** GetUserQuota 响应体 */
  type GetUserQuotaRes = PutUserQuotaReq;

  // -------- Bucket 基础 --------
  /** GetBucketLocation 响应体 */
  interface GetBucketLocationRes {
    locationConstraint: string;
  }
  /** GetBucketStorageclass 响应体 */
  interface GetBucketStorageclassRes {
    storageClass: BOSStorageClassType;
  }

  // -------- Bucket ACL --------
  /** GetBucketAcl 响应体 */
  interface GetBucketAclRes {
    owner: Owner;
    accessControlList: BOSACLItem<BucketPermission>[];
  }

  // -------- Bucket 生命周期 --------
  /** PutBucketLifecycle 请求体 */
  type PutBucketLifecycleReq = BucketLifecycle;
  /** GetBucketLifecycle 响应体 */
  interface GetBucketLifecycleRes {
    BucketLifecycle: BucketLifecycle;
  }

  // -------- Bucket 日志 --------
  /** PutBucketLogging 请求体 */
  interface PutBucketLoggingReq {
    targetBucket: string;
    targetPrefix: string;
  }
  /** GetBucketLogging 响应体 */
  interface GetBucketLoggingRes {
    status: 'enabled' | 'disabled';
    targetBucket: string;
    targetPrefix: string;
  }

  // -------- Bucket 静态网站托管 --------
  /** PutBucketStaticWebsite 请求体 */
  interface PutBucketStaticWebsiteReq {
    index: string;
    notFound: string;
    /** 返回错误页面时的HTTP状态码。取值："200"、"404"（默认） */
    notFoundHttpStatus: string;
  }
  /** GetBucketStaticWebsite 响应体（与请求体同形） */
  type GetBucketStaticWebsiteRes = PutBucketStaticWebsiteReq;

  // -------- Bucket 数据加密 --------
  /** GetBucketEncryption 响应体 */
  interface GetBucketEncryptionRes {
    encryptionAlgorithm: string;
  }

  // -------- Bucket 数据同步（Replication） --------
  /** PutBucketReplication 请求体 */
  type PutBucketReplicationReq = BucketReplicationData;
  /** GetBucketReplication 响应体 */
  type GetBucketReplicationRes = BucketReplicationData;

  // -------- Bucket 合规保留（ObjectLock） --------
  /** InitBucketObjectLock 请求体 */
  interface InitBucketObjectLockReq {
    retentionDays: number;
  }
  /** ExtendBucketObjectLock 请求体 */
  interface ExtendBucketObjectLockReq {
    extendRetentionDays: number;
  }
  /** GetBucketObjectLock 响应体 */
  interface GetBucketObjectLockRes {
    lockStatus: string;
    createDate: string;
    retentionDays: number;
    /** 合规保留策略过期时间，只有IN_PROGRESS状态下才可能会过期 */
    expirationDate?: number;
  }

  // -------- Bucket 版本控制 --------
  /** GetBucketVersioning 响应体 */
  interface GetBucketVersioningRes {
    status: BucketVersionStateType;
  }

  // -------- Object 操作 --------
  /** PutObject 响应头（响应体为空） */
  interface PutObjectResHeaders extends OpenAPIHeaders {
    'etag': string;
    'x-bce-version-id': string;
  }
  /** SelectObject 请求体 */
  interface SelectObjectReq {
    selectRequest: Record<string, any>;
    type: 'json' | 'csv';
  }

  // -------- Object ACL --------
  /** GetObjectAcl 响应体 */
  interface GetObjectAclRes {
    accessControlList: Array<BOSACLItem<ObjectPermission>>;
  }

  // -------- Multipart Upload --------
  /** ListMultipartUploads 响应体 */
  interface ListMultipartUploadsRes {
    bucket: string;
    commonPrefixes: string;
    delimiter: string;
    prefix: string;
    isTruncated: boolean;
    keyMarker: string;
    maxUploads: number;
    nextKeyMarker: number;
    uploads: {
      key: string;
      uploadId: string;
      initiated: string;
      storageClass: string;
      owner: Owner;
    };
  }

  // -------- 文件夹分享 --------
  /** CreateFolderShareUrl 请求体 */
  interface CreateFolderShareUrlReq {
    bucket: string;
    region: string;
    prefix: string;
    shareCode: string;
    durationSeconds: number;
    endpoint?: string;
  }
  /** CreateFolderShareUrl 响应体 */
  interface CreateFolderShareUrlRes {
    linkExpireTime: number;
    shareCode: string;
    shareUrl: string;
  }

  // -------- PutSuperObject（大对象上传辅助参数） --------
  /** SuperUpload 任务状态 */
  type SuperUploadState = 'waiting' | 'inited' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';

  /** SuperUpload 进度回调参数 */
  interface SuperUploadProgress {
    /** 当前上传速度（已格式化，如 "1.2 MB/s"） */
    speed: string;
    /** 当前上传进度（已格式化，如 "10 MB / 100 MB"） */
    progress: string;
    /** 当前上传进度百分比（如 "10%"） */
    percent: string;
    /** 已上传字节数 */
    uploadedBytes: number;
    /** 文件总字节数 */
    totalBytes: number;
  }

  /** SuperUpload 状态变更回调参数 */
  interface SuperUploadStateChangePayload {
    message: string;
    data: Record<string, any> | null;
  }

  /** PutSuperObject 请求参数 */
  interface PutSuperObjectReq {
    bucketName: string;
    objectName: string;
    data: string | Buffer | Blob;
    chunkSize?: number;
    partConcurrency?: number;
    StorageClass?: BOSStorageClassType;
    ContentLength?: number;
    ContentType?: string;
    createTime?: string;
    uploadId?: string;
    onProgress?: (evt: SuperUploadProgress) => void;
    onStateChange?: (state: SuperUploadState, payload: SuperUploadStateChangePayload) => void;
  }

  /**
   * 大文件超大对象上传任务实例。
   * 由 {@link BosClient.putSuperObject} 创建，提供分片上传的状态管理与控制能力。
   */
  class SuperUpload {
    constructor(client: BosClient, options: PutSuperObjectReq);

    /** 关联的 BosClient 实例 */
    client: BosClient;
    /** 当前任务状态 */
    state: SuperUploadState;

    /**
     * 暂停任务（仅在 RUNNING 状态下可调用）。
     * @returns 操作是否成功
     */
    pause(): boolean;

    /**
     * 恢复任务（仅在 PAUSED 状态下可调用）。
     * @returns 操作是否成功
     */
    resume(): boolean;

    /** 任务是否处于运行中 */
    isRunning(): boolean;
    /** 任务是否已暂停 */
    isPaused(): boolean;
    /** 任务是否已取消 */
    isCancelled(): boolean;
    /** 任务是否已完成 */
    isCompleted(): boolean;
    /** 任务是否已失败 */
    isFailed(): boolean;
  }

  class BosClient extends BceBaseClient {
    config: BosClientConfig;

    constructor(options: BosClientOptions);

    sendRequest<S = any, H extends Record<string, any> = any>(
      httpMethod: HttpMethod,
      varArgs: BosRequestArgs,
      requestUrl?: string
    ): BosResponse<S, H>;
    sendRequest<S = any, H extends Record<string, any> = any>(
      httpMethod: HttpMethod,
      varArgs: BosRequestArgs & {config: BosRequestConfig & {requestInstance: true}},
      requestUrl?: string
    ): [BosResponse<S, H>, ClientRequest];

    /** ***********************************************************************************
     *                                  Service相关接口
     ************************************************************************************ */

    /**
     * 设置用户的额度，额度包括总的 Bucket 数及各个 Region 总的存储容量，当前总的 Bucket 数最大值不能超过 100，注意该接口只能被主用户调用。
     * @doc https://cloud.baidu.com/doc/BOS/s/zkc5ne644
     */
    putUserQuota(body: PutUserQuotaReq, options?: BosClientAPIOptions): BosResponse;

    /**
     * 查看用户的额度设置，注意该接口只能被主用户调用。
     * @doc https://cloud.baidu.com/doc/BOS/s/8kc5nid9c
     */
    getUserQuota(options?: BosClientAPIOptions): BosResponse<GetUserQuotaRes>;

    /**
     * 删除额度设置，注意该接口只能被主用户调用。
     * @doc https://cloud.baidu.com/doc/BOS/s/gkc5nqxyw
     */
    deleteUserQuota(options?: BosClientAPIOptions): BosResponse;

    /**
     * 列举请求者拥有的所有 Bucket。
     * @doc https://cloud.baidu.com/doc/BOS/s/bkcacfjvi
     * @remarks
     * - 接口本身无特殊请求参数 / 请求头；通过 `options.config` 透传 Client 级配置（如 `region` / `endpoint` / `signal`）。
     * - 一次请求最多返回 100 个 Bucket 的信息。
     * - 匿名访问会返回 `403 Forbidden / AccessDenied`。
     */
    listBuckets(
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<ListBucketsRes>, ClientRequest];
    listBuckets(options?: BosClientAPIOptions): BosResponse<ListBucketsRes>;

    /** ***********************************************************************************
     *                                  Bucket基础操作
     ************************************************************************************ */

    /**
     * 获取 Bucket 所在的区域
     * @doc https://cloud.baidu.com/doc/BOS/s/Wkc49bfga
     */
    getBucketLocation(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketLocationRes>;

    /**
     * 创建Bucket。每一个用户只允许创建100个Bucket。创建的Bucket其权限默认为private，即Bucket Owner获得FULL_CONTROL，其他人没有任何权限。
     * - 若一个用户创建的Bucket超过100个，服务将返回400 Bad Request，错误码TooManyBuckets。
     * - 若请求的Bucket已存在，无论该Bucket是否是请求者创建，都会返回409 Conflict，错误信息：BucketAlreadyExists。
     * - 创建数据多AZ分布的bucket的前提是该region已经支持创建多AZ的bucket，目前BOS仅支持北京、广州和苏州三个region，其它region陆续开通中。
     * - BOS存储桶名称存在限制，只能包含小写字母、数字和“-”，开头结尾为小写字母和数字，长度在4-63之间。
     * @doc https://cloud.baidu.com/doc/BOS/s/xkc4eo6i9
     */
    putBucket(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /** `putBucket` alias */
    createBucket(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 查看Bucket是否存在和请求者是否有权限访问这个Bucket。当请求返还200 OK时，说明Bucket存在且请求者有权限访问。
     * @doc https://cloud.baidu.com/doc/BOS/s/Mkc4eqkiz
     */
    headBucket(bucketName: string, options?: BosClientAPIOptions): Promise<boolean>;

    /** `headBucket` alias，判断 Bucket 是否存在。 */
    doesBucketExist(bucketName: string, options?: BosClientAPIOptions): Promise<boolean>;

    /**
     * 查看Bucket是否存在和请求者是否有权限访问这个Bucket。并获取Bucket的元信息（headBucket 已被占用，故另起 _headBucket）
     * @doc https://cloud.baidu.com/doc/BOS/s/Mkc4eqkiz
     */
    _headBucket(bucketName: string, options?: BosClientAPIOptions): BosResponse<{}, HeadBucketHeaders>;

    /**
     * 删除一个Bucket。
     * - 在删除前需要保证此Bucket下的所有Object和未完成的三步上传Part已经已被删除，否则会删除失败。
     * - 删除Bucket之前确认该Bucket没有开通跨区域复制，不是跨区域复制规则中的源Bucket，否则不能删除
     * @doc https://cloud.baidu.com/doc/BOS/s/Rkc4esgxu
     */
    deleteBucket(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 本接口用来设置Bucket的默认存储类型。如果用户使用API、CLI或者SDK上传的Object未指定存储类型，则继承Bucket的默认存储类型。
     * 如果上传Object指定的存储类型和Bucket默认存储类型不一致时，以Object的存储类型为准。存储类型包含标准存储、低频存储、冷存储和归档存储四种，具体使用场景和性能请参见[分级存储](https://cloud.baidu.com/doc/BOS/s/Hku3pfc92)。
     * @doc https://cloud.baidu.com/doc/BOS/s/Nkc4f6eye
     */
    putBucketStorageclass(
      bucketName: string,
      storageClass: BOSStorageClassType,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 取Bucket的默认存储类型
     * @doc https://cloud.baidu.com/doc/BOS/s/Ukc4f8p3b
     */
    getBucketStorageclass(
      bucketName: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<GetBucketStorageclassRes>, ClientRequest];
    getBucketStorageclass(
      bucketName: string,
      options?: BosClientAPIOptions
    ): BosResponse<GetBucketStorageclassRes>;

    /** ***********************************************************************************
     *                                  Bucket权限控制
     ************************************************************************************ */

    /**
     * 使用CannedAcl设置Bucket的访问权限。通过头域的“x-bce-acl"来设置，当前可设置的权限包括：private, public-read, public-read-write（大小写敏感）
     * - 只有Bucket的拥有者和被授予FULL_CONTROL权限的用户才能设置Bucket的ACL权限。
     * - 在创建Bucket时，Bucket权限会默认设置为private。
     * - BOS系统不支持在同一请求中，同时设置“x-bce-acl”和上传ACL文件。
     * @doc https://cloud.baidu.com/doc/BOS/s/pkc4etf4p
     */
    putBucketAcl(bucketName: string, acl: BOSCannedACLType, options?: BosClientAPIOptions): BosResponse;

    /** putBucketAcl alias */
    setBucketCannedAcl(bucketName: string, cannedAcl: BOSCannedACLType, options?: BosClientAPIOptions): BosResponse;

    /**
     * 使用ACL文件设置Bucket的访问权限。ACL文件格式参见[ACL文件格式](https://cloud.baidu.com/doc/BOS/s/Tjwvysda9#%E4%B8%8A%E4%BC%A0acl%E6%96%87%E4%BB%B6%E6%96%B9%E5%BC%8F%E7%9A%84%E6%9D%83%E9%99%90%E6%8E%A7%E5%88%B6)。
     * - 只有Bucket的拥有者和被授予FULL_CONTROL权限的用户才能设置Bucket的ACL权限。
     * - 在创建Bucket时，Bucket权限会默认设置为private。
     * - BOS系统不支持在同一请求中，同时设置“x-bce-acl”和上传ACL文件。
     * @doc https://cloud.baidu.com/doc/BOS/s/pkc4etf4p
     */
    setBucketAcl(bucketName: string, acl: BOSACLItem<BucketPermission>[], options?: BosClientAPIOptions): BosResponse;

    /**
     * 获取某个Bucket的访问权限
     * @doc https://cloud.baidu.com/doc/BOS/s/2kc4euaor
     */
    getBucketAcl(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketAclRes>;

    /** ***********************************************************************************
     *                                  Bucket生命周期
     ************************************************************************************ */

    /**
     * 创建生命周期管理规则
     * - 只有bucket的owner且拥有FULL_CONTROL权限才能够进行此请求。
     * - PutBucketLifecycle会覆盖原有的生命周期规则， 如果需要在原有规则基础上新增， 需要在请求中携带所有新旧规则。
     * @doc https://cloud.baidu.com/doc/BOS/s/Vkc4f2c1y
     */
    putBucketLifecycle(bucketName: string, body: PutBucketLifecycleReq, options?: BosClientAPIOptions): BosResponse;
    /**
     * 获取定义的生命周期管理规则详细信息
     * - 如果请求的源Bucket不存在，返回404错误，错误码为NoSuchBucket。
     * - 如果请求的源Bucket没有配置lifecycle，返回404错误，错误码为NoLifecycleConfiguration。
     * @doc https://cloud.baidu.com/doc/BOS/s/skc4f3bs0
     */
    getBucketLifecycle(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketLifecycleRes>;
    /**
     * 删除定义的生命周期管理规则
     * @doc https://cloud.baidu.com/doc/BOS/s/mkc4f5k1x
     */
    deleteBucketLifecycle(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket日志管理
     ************************************************************************************ */

    /** Bucket 访问日志 */
    /**
     * 开启Bucket的访问日志并指定存放日志的Bucket和访问日志的文件前缀。访问日志的规则请参见[日志命名规则](https://cloud.baidu.com/doc/BOS/s/zk1rm7uwr#%E6%97%A5%E5%BF%97%E5%91%BD%E5%90%8D%E8%A7%84%E5%88%99)和[日志格式](https://cloud.baidu.com/doc/BOS/s/zk1rm7uwr#%E6%97%A5%E5%BF%97%E6%A0%BC%E5%BC%8F)。
     * - 用户必须是源Bucket的owner且拥有FULL_CONTROL权限，且是目标Bucket的owner。
     * - 源Bucket和目标Bucket必须同时存在。
     * - 源Bucket和目标Bucket必须属于同一个Region。
     * - 如果HTTP Body中Json不合法，BOS会返回CODE_MALFORMED_JSON错误。
     * - 如果HTTP Body中Json有无效字段，BOS会返回CODE_INAPPROPRIATE_JSON错误。
     * - 用户可将不同的源Bucket的Logging都保存在同一个目标Bucket内，建议指定不同的 targetPrefix便于区分。
     * - 如果源Bucket开通了Logging功能，源Bucket被删除的同时，相应的Logging信息也将被删除。
     * - 如果Logging的目标Bucket被删除，则源Bucket的Logging功能会被自动关闭。
     * - 如果需要修改目标Bucket等信息，可再发送一个PutBucketLogging请求，请求中包含需要修改的信息。
     * - `targetPrefix`表示存储访问日志记录的Object名字前缀，可以为空。如果不为空时，targetPrefix可以包含字母、数字、中划线、下划线、斜杠，且必须以字母开头，长度不大于32位。
     * - 重复请求返回结果相同。
     * @doc https://cloud.baidu.com/doc/BOS/s/Wkc4ezpiy
     */
    putBucketLogging(bucketName: string, body: PutBucketLoggingReq, options?: BosClientAPIOptions): BosResponse;

    /**
     * 获取某个Bucket的访问日志配置
     * - 如果请求的源Bucket不存在，返回404错误，错误码为NoSuchBucket。
     * - 请求者只有是源Bucket的owner且拥有FULL_CONTROL权限才允许查看，否则返回403错误，错误码为AccessDenied。
     * @doc https://cloud.baidu.com/doc/BOS/s/ukc4f0uif
     */
    getBucketLogging(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketLoggingRes>;

    /**
     * 关闭Bucket访问日志记录功能
     * - 如果请求的源Bucket不存在，返回404错误，错误码为NoSuchBucket。
     * - 请求者只有是源Bucket的owner且拥有FULL_CONTROL权限，才能关闭Bucket访问日志记录功能。否则，BOS返回403错误，错误码为AccessDenied。
     * - 如果请求的源Bucket没有开通Logging功能，依然返回HTTP状态码204。
     * @doc https://cloud.baidu.com/doc/BOS/s/qkc4f1p2v
     */
    deleteBucketLogging(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket事件通知
     ************************************************************************************ */

    // putNotification(): BosResponse;
    // getNotification(): BosResponse;
    // deleteNotification(): BosResponse;
    // postEvent(): BosResponse;
    // postResult(): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket静态网站
     ************************************************************************************ */

    /**
     * 设置静态网站托管。
     * - 用户必须对bucket具有full control 权限。
     * - 不建议设置归档文件，归档文件没有取回时不可读，StaticWebsite此时不会生效。
     * @doc https://cloud.baidu.com/doc/BOS/s/jkc4fl181
     */
    putBucketStaticWebsite(bucketName: string, data: PutBucketStaticWebsiteReq, options?: BosClientAPIOptions): BosResponse;
    /**
     * 获取bucket的静态网站托管信息。
     * - 当未开启静态网站托管, 返回http status 为 404， 错误Code为 NoSuchBucketStaticWebSiteConfig
     * - 当未静态网站托管功能被禁止, 返回http status 为 501， 错误Code为 StaticWebSiteIsDisable
     * @doc https://cloud.baidu.com/doc/BOS/s/Xkc4fmkit
     */
    getBucketStaticWebsite(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketStaticWebsiteRes>;
    /**
     * 删除bucket设置的静态网站托管信息，并关闭此bucket的静态网站托管。
     * - 用户必须对bucket具有 FULL_CONTROL 权限。
     * @doc https://cloud.baidu.com/doc/BOS/s/9kc4ftbgn
     */
    deleteBucketStaticWebsite(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket数据加密
     ************************************************************************************ */

    /**
     * 开启指定Bucket的加密开关
     * @doc https://cloud.baidu.com/doc/BOS/s/9kc4f9eqx
     */
    putBucketEncryption(
      bucketName: string,
      body: {encryptionAlgorithm: 'AES256' | 'SM4'},
      options?: BosClientAPIOptions
    ): BosResponse;
    /**
     * 判断Bucket服务端加密是否打开
     * @doc https://cloud.baidu.com/doc/BOS/s/Zkc4fa6x5
     */
    getBucketEncryption(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketEncryptionRes>;
    /**
     * 关闭服务端加密功能
     * @doc https://cloud.baidu.com/doc/BOS/s/ukc4fdis4
     */
    deleteBucketEncryption(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket跨域访问
     ************************************************************************************ */

    // putBucketCors(bucketName: string, body: BucketCorsData): BosResponse;
    // getBucketCors(bucketName: string): BosResponse<BucketCorsData>;
    // deleteBucketCors(bucketName: string): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket回收站
     ************************************************************************************ */
    // putBucketTrash(bucketName: string, trashDir: '.trash'): BosResponse;
    // getBucketTrash(bucketName: string): BosResponse<{trashDir: string}>;
    // deleteBucketTrash(bucketName: string): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket数据同步
     ************************************************************************************ */

    /**
     * 创建数据同步。每个id唯一确定一条replication规则，对一个id首次put会认为是创建一条replication规则，对同一个id的再次put认为是覆盖，如果原先status是enable，则不允许覆盖成disable；如果原先是enable，再次put成enable，replication会重新开始执行；不允许两个replication规则除了id不一致以外其他项均一致。
     * - 用户必须是源Bucket的owner且拥有FULL_CONTROL权限，且有目标Bucket的写权限。
     * - 目标Bucket和源Bucket必须存在。
     * - 目标Bucket和源Bucket可以是同region下的Bucket，也可以是不同Region下的Bucket。
     * - 目标Bucket和源Bucket可以是同账户下的bucket，也可以是不同账户下的bucket，但是源账户需要有目的bucket的写权限
     * - 整个配置的大小不能超过128k，当前bucket下所有规则长度不得超过200KB
     * - 数据同步暂时不支持归档类型文件的同步，进行数据同步时会忽略归档类型文件。
     * - 用户最多配置10条replication规则
     * - 单个规则，最多20个resource
     * - 单个规则，最多20个notIncludeResource
     * - id 由数字字母 - _ 组成，不得超过20个字符
     * - 目前源bucket开启版本控制后，不支持数据同步功能。
     * @doc https://cloud.baidu.com/doc/BOS/s/fkc4evoy4
     */
    putBucketReplication(bucketName: string, body: PutBucketReplicationReq, options?: BosClientAPIOptions): BosResponse;

    /**
     * 获取bucket指定id的数据同步信息，包括源Bucket名称、目的Bucket名称、存储类型、是否进行历史复制，数据同步策略，目的region等
     * @doc https://cloud.baidu.com/doc/BOS/s/7kc4ewr1u
     */
    getBucketReplication(
      bucketName: string,
      id?: string,
      options?: BosClientAPIOptions
    ): BosResponse<GetBucketReplicationRes>;

    /**
     * 删除对应id的数据同步复制配置
     * @doc https://cloud.baidu.com/doc/BOS/s/dkc4exqvg
     */
    deleteBucketReplication(bucketName: string, id?: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 获取指定id的数据同步复制的进程状态
     * @doc https://cloud.baidu.com/doc/BOS/s/ekc4eyua6
     */
    getBucketReplicationProgress(
      bucketName: string,
      id?: string,
      options?: BosClientAPIOptions
    ): BosResponse<{
      /** 是否开启了数据同步功能 */
      status: 'enabled' | 'disabled';
      /** 历史文件数据同步已完成百分比，不再有效返回0 */
      historyReplicationPercent: number;
      /** UNIX 时间戳，最新的数据复制的时间 */
      latestReplicationTime: string;
    }>;

    /**
     * 获取bucket所有的replication同步规则
     * @doc https://cloud.baidu.com/doc/BOS/s/Vkcoek9t5
     */
    listBucketReplication(bucketName: string, options?: BosClientAPIOptions): BosResponse<{rules: BucketReplicationData[]}>;

    /** ***********************************************************************************
     *                                  Bucket合规保留
     ************************************************************************************ */

    /**
     * 为指定Bucket创建基于时间的合规保留策略，此时策略状态变成IN_PROGRESS状态。
     * @doc https://cloud.baidu.com/doc/BOS/s/Xkc4jkho7
     */
    initBucketObjectLock(bucketName: string, body: InitBucketObjectLockReq, options?: BosClientAPIOptions): BosResponse;

    /**
     * 获取 Bucket 合规保留策略配置信息
     * @doc https://cloud.baidu.com/doc/BOS/s/bkc4lq5mq
     */
    getBucketObjectLock(bucketName: string, options?: BosClientAPIOptions): BosResponse<GetBucketObjectLockRes>;

    /**
     * 当合规保留策略处于IN_PROGRESS和EXPIRED状态时，您可以通过该接口进行删除合规保留策略，若合规保留策略处于LOCKED锁定状态时，您将不能进行删除操作，除非删除该Bucket。
     * @doc https://cloud.baidu.com/doc/BOS/s/rkc4lrfw8
     */
    deleteBucketObjectLock(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 将合规保留策略立即锁定，变成LOCKED锁定状态，当合规保留策略处于LOCKED锁定时，任何人不可删除该策略，除非删除该Bucket，请您谨慎配置。
     * @doc https://cloud.baidu.com/doc/BOS/s/xkc4lsd70
     */
    completeBucketObjectLock(bucketName: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 延长合规保留策略保护周期
     * @doc https://cloud.baidu.com/doc/BOS/s/okc4ltaed
     */
    extendBucketObjectLock(
      bucketName: string,
      body: ExtendBucketObjectLockReq,
      options?: BosClientAPIOptions
    ): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket原图保护
     ************************************************************************************ */
    // putBucketCopyrightProtection(bucketName: string, body: {resource: string[]}): BosResponse;
    // getCopyrightProtection(bucketName: string): BosResponse<{resource: string[]}>;
    // deleteCopyrightProtection(bucketName: string): BosResponse;

    /** ***********************************************************************************
     *                                  Bucket版本控制
     ************************************************************************************ */

    /**
     * 设置指定存储空间（Bucket）的版本控制状态
     * - 要配置版本控制，您必须有PutBucketVersioning权限。
     * - Bucket包括未开启(notEnabled)、开启（enabled）或者暂停（suspended）三种版本控制状态。默认情况下Bucket处于未开启版本控制状态。
     * - 在Bucket处于开启版本控制状态下，所有新添加的文件（Object）都将拥有唯一的版本ID，将累积所添加Object的多个版本。
     * - 在Bucket处于暂停版本控制状态下，所有新添加Object的版本ID将为null，将不再为此状态下添加的Object累积更多的版本。
     * @doc https://cloud.baidu.com/doc/BOS/s/flxucacoe
     */
    putBucketVersioning(bucketName: string, status: BucketVersionStateType, options?: BosClientAPIOptions): BosResponse;

    /**
     * 获取某个Bucket的version状态
     * @doc https://cloud.baidu.com/doc/BOS/s/zlxucuoxg
     */
    getBucketVersioning(
      bucketName: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<GetBucketVersioningRes>, ClientRequest];
    getBucketVersioning(
      bucketName: string,
      options?: BosClientAPIOptions
    ): BosResponse<GetBucketVersioningRes>;

    /** ***********************************************************************************
     *                                  Object基础操作
     ************************************************************************************ */

    /**
     * 获得指定Bucket的Object信息列表
     * @doc https://cloud.baidu.com/doc/BOS/s/Ekc4epj6m
     */
    listObjects(
      bucketName: string,
      options: ListObjectOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<ListObjectsRes>, ClientRequest];
    listObjects(
      bucketName: string,
      options?: ListObjectOptions
    ): BosResponse<ListObjectsRes>;

    /**
     * 向指定的Bucket上传一个文件，请求者必须具有Write权限。在PutObject前需要确保对应的Bucket已经存在，BOS支持Object文件的长度范围是0Byte-5GB。如果需要上传大于5GB的文件，请参考[分块上传指南](https://cloud.baidu.com/doc/BOS/s/Xkc5uwbuo)
     * - Node.js 环境用 {@link BosClient.putObjectFromFile} 或 {@link BosClient.putObjectFromDataUrl}。
     * - 浏览器环境用 {@link BosClient.putObjectFromBlob} 或 {@link BosClient.putObjectFromDataUrl}。
     * - 上传JSON或其他字符串类型数据用 {@link BosClient.putObjectFromString}
     * - Content-Length是必须参数，如果请求者指定的Content-Length比实际请求体（Object的实际数据）长度小，BOS只保存Content-Length指定长度的数据，多的这部分数据直接废弃；相反，如果Content-Length的长度大，BOS将一直等待请求者上传数据，直到超时。
     * - 上传的Object，如不指定Content-Type，BOS会自动识别设置合适的Content-Type，若无法识别则默认为application/octet-stream
     * - 由于BOS本身是一个(<Key>,<Value>)的存储系统，所以原则上并不会存在“文件夹”的概念。若需要按照文件夹来划分，可以把 “/” 符号作为分隔符模拟文件夹。例如上传object为 “work/test/123.txt”，控制台显示时会根据“/”自动切分，创建work文件夹下面的test文件夹和test文件夹下的123.txt文件。
     * - 如果请求头中同时包含多个条件Header（If-Match、If-None-Match、If-Modified-Since、If-Unmodified-Since），BOS的判断顺序遵循RFC 7232 第六章规定，详情请见RFC 7232。
     * @doc https://cloud.baidu.com/doc/BOS/s/Ikc5nv3wc
     */
    putObject(
      bucketName: string,
      key: string,
      data?: any,
      options?: BosClientAPIOptions
    ): BosResponse<{}, PutObjectResHeaders>;

    /**
     * 从字符串直传 Object。
     * @platform Node.js | Browser
     */
    putObjectFromString(bucketName: string, key: string, data: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 从浏览器 Blob 直传 Object。
     * @platform Browser
     * @remarks Node.js 环境请改用 {@link BosClient.putObjectFromFile} 或 {@link BosClient.putObject}。
     */
    putObjectFromBlob(bucketName: string, key: string, blob: Blob, options?: BosClientAPIOptions): BosResponse;

    /**
     * 从本地文件直传 Object。
     * @platform Node.js
     * @remarks 浏览器环境请改用 {@link BosClient.putObjectFromBlob} 或 {@link BosClient.putObjectFromDataUrl}。
     */
    putObjectFromFile(bucketName: string, key: string, filename: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 从 base64 DataUrl 直传 Object。
     * @platform Node.js | Browser
     */
    putObjectFromDataUrl(bucketName: string, key: string, data: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 使用HTML表单上传文件到指定bucket，用于实现通过浏览器上传文件到bucket。在PutObject操作中通过HTTP请求头传递参数，在PostObject操作中使用消息实体中的表单域传递参数，其中消息实体使用多重表单格式（multipart/form-data）编码
     * @doc https://cloud.baidu.com/doc/BOS/s/akc5orrn5
     */
    postObject(
      bucketName: string,
      key: string,
      data: any,
      options?: BosClientAPIOptions & {policy?: Record<string, any>}
    ): BosResponse;

    /**
     * 用于把一个已经存在的Object拷贝为另外一个Object，支持Object文件的长度范围是0Byte-5GB。该接口也可以用来实现Meta更新（使用replace模式且源和目标指向同一个文件）。此接口需要请求者在header中指定拷贝源。
     * CopyObject接口支持跨区域文件复制，即复制文件所在的源Bucket和目标Bucket可以不在同一region(目前只支持从其它Region向本Region复制数据)。当进行跨区域文件复制时，复制产生的流量会收取跨区域流量费。
     * @doc https://cloud.baidu.com/doc/BOS/s/Lkc5p9g3w\
     *
     * 示例:
     * ```js
     * const response = await client.copyObject(
     *   "SourceBucket",
     *   "SourceObject",
     *   "TargetBucket",
     *   "TargetObject",
     *   {
     *     "x-bce-copy-source": "/SourceBucket/SourceObject"
     *     "x-bce-copy-source-if-match": "3858f62230ac3c915f300c664312c11f"
     *     "x-bce-storage-class": "STANDARD_IA"
     *   }
     * );
     * ```
     *
     * 多版本请求示例:
     * ```js
     * const response = await client.copyObject(
     *   "SourceBucket",
     *   "SourceObject",
     *   "TargetBucket",
     *   "TargetObject",
     *   {
     *     "x-bce-copy-source": "/SourceBucket/SourceObject?versionId=AJyQ0XRhboY="
     *     "x-bce-copy-source-if-match": "3858f62230ac3c915f300c664312c11f"
     *     "x-bce-storage-class": "STANDARD_IA"
     *   }
     * );
     * ```
     */
    copyObject(
      sourceBucketName: string,
      sourceKey: string,
      targetBucketName: string,
      targetKey: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<CopyObjectRes, CopyObjectHeaders>, ClientRequest];
    copyObject(
      sourceBucketName: string,
      sourceKey: string,
      targetBucketName: string,
      targetKey: string,
      options?: BosClientAPIOptions
    ): BosResponse<CopyObjectRes, CopyObjectHeaders>;

    /**
     * 从BOS下载某个Object。此操作需要请求者对该Object有读权限。请求者可以在Header中设置Range来指定需要获取的Object数据的范围。
     * @doc https://cloud.baidu.com/doc/BOS/s/xkc5pcmcj
     */
    getObject(
      bucketName: string,
      key: string,
      range?: string,
      options?: BosClientAPIOptions & {versionId?: string; 'x-bce-traffic-limit'?: number}
    ): BosResponse<unknown, {etag: string}>;

    /**
     * 从BOS下载某个Object。此操作需要请求者对该Object有读权限。请求者可以在Header中设置Range来指定需要获取的Object数据的范围。
     * @doc https://cloud.baidu.com/doc/BOS/s/xkc5pcmcj
     * @platform Node.js
     * @remarks 仅 Node.js 环境可用（依赖 `fs` 写文件）。浏览器请使用 {@link BosClient.getObject} 自行处理响应体。
     */
    getObjectToFile(
      bucketName: string,
      key: string,
      filename: string,
      range?: string,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 获取某个Object的Meta信息，但此时并不返回数据
     * @doc https://cloud.baidu.com/doc/BOS/s/6kc5suqj3
     */
    getObjectMetadata(
      bucketName: string,
      key: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<void, GetObjectMetaHeaders>, ClientRequest];
    getObjectMetadata(
      bucketName: string,
      key: string,
      options?: BosClientAPIOptions
    ): BosResponse<void, GetObjectMetaHeaders>;

    /**
     * 取回归档存储文件，请求者必须有归档存储文件的读权限，并且归档存储文件处于冰冻状态
     * - 如果使用软链接访问该接口，会根据软链接的目标文件的存储类型和状态进行处理。
     * - 如果使用软链接访问该接口且目标文件删除了，会返回Http 404，SymlinkTargetNotExist。
     * - 多版本环境下，RestoreObject后的文件为空版本
     * @doc https://cloud.baidu.com/doc/BOS/s/akc5t3f12
     */
    restoreObject(
      bucketName: string,
      objectName: string,
      options: BosClientAPIOptions & {
        'x-bce-restore-tier': BOSRestoreTierType;
        'x-bce-restore-days': number;
        config: BosRequestConfig & {requestInstance: true};
      }
    ): [BosResponse<{}>, ClientRequest];
    restoreObject(
      bucketName: string,
      objectName: string,
      options?: BosClientAPIOptions & {
        'x-bce-restore-tier': BOSRestoreTierType;
        'x-bce-restore-days': number;
      }
    ): BosResponse<{}>;

    /**
     * 此接口用于从指定URL抓取资源，并将资源存储到指定的Bucket中。此操作需要请求者对该Bucket有写权限，每次只能抓取一个Object，且用户可以自定义Object的名称。
     * FetchObject接口抓取资源的大小限制为0~10GB。其中`x-bce-fetch-source`为必填写参数，表示待抓取资源的源URL地址。
     * @doc https://cloud.baidu.com/doc/BOS/s/Fkc5tf39q
     *
     * 示例:
     * ```js
     * const response = await client.fetchObject(
     *   bucketName,
     *   objectName,
     *   {'x-bce-fetch-source': 'http://www.abc.com/img.jpg'}
     * );
     * ```
     */
    fetchObject(
      bucketName: string,
      objectName: string,
      options: BosClientAPIOptions & {
        'x-bce-fetch-source': string;
        'x-bce-fetch-mode'?: 'sync' | 'async';
        'x-bce-callback-address'?: string;
        'x-bce-fetch-referer'?: string;
        'x-bce-fetch-user-agent'?: string;
      }
    ): BosResponse;

    /**
     * 删除指定Bucket的一个Object，要求请求者对此Object有写权限。
     * @doc https://cloud.baidu.com/doc/BOS/s/bkc5tsslq
     *
     * 示例:
     * ```js
     * const response = await client.deleteObject("Bucket", "ObjectName");
     * ```
     *
     * 多版本示例:
     * ```js
     * // 永久删除指定版本的Object
     * const response = await client.deleteObject("Bucket", "ObjectName", {versionId: 'AISQpTmwRHU='});
     *
     * // 临时删除当前版本的Object（不指定versionId），新增版本ID为"null"的Object
     * const response = await client.deleteObject("Bucket", "ObjectName");
     *
     * // 删除版本ID为"null"的Object
     * const response = await client.deleteObject("Bucket", "ObjectName", {versionId: 'null'});
     * ```
     */
    deleteObject(
      bucketName: string,
      key: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<{}>, ClientRequest];
    deleteObject(
      bucketName: string,
      key: string,
      options?: BosClientAPIOptions
    ): BosResponse<{}>;

    /**
     * 该命令可以实现通过一个HTTP请求删除同一个Bucket下的多个Object。
     *   - 支持一次请求内最多删除1000个Object。
     *   - 消息体（body）不超过2M。
     *   - 返回的消息体中只包含删除过程中出错的Object结果；如果所有Object都删除都成功的话，则没有消息体。
     * @doc https://cloud.baidu.com/doc/BOS/s/tkc5twspg
     *
     * 示例:
     * ```js
     * const response = await client.deleteMultipleObjects(
     *   "BucketName",
     *   [
     *     {"key": "my-object1"},
     *     {"key": "my-object2"}
     *   ]
     * );
     * ```
     *
     * 多版本示例:
     * ```js
     * const response = await client.deleteMultipleObjects(
     *   "BucketName",
     *   [
     *     {"key": "my-object1", versionId: "AISQpTmwRH1="},
     *     {"key": "my-object2", versionId: "AISQpTmwRHU="}
     *   ]
     * );
     * ```
     */
    deleteMultipleObjects(
      bucketName: string,
      objects: Array<{key: string; versionId?: string} | string>,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<DeleteMultipleObjectsRes>, ClientRequest];
    deleteMultipleObjects(
      bucketName: string,
      objects: Array<{key: string; versionId?: string} | string>,
      options?: BosClientAPIOptions
    ): BosResponse<DeleteMultipleObjectsRes>;

    /**
     * AppendObject以追加写的方式上传文件。通过AppendObject操作创建的Object类型为Appendable Object，可以对该Object追加数据；而通过PutObject上传的Object是Normal Object，不可进行数据追加写。
     * - Appendable Object大小限制为0~48.8T
     * - AppendObject接口在进行追加写时要求对该Object有写权限
     * - 归档类型对象暂时不支持AppendObject
     * - 软链接不是可追加类型，会返回HTTP 403，ObjectUnappendable错误。
     * - 当前版本下，多版本的bucket不可进行AppendObject的写入，对于历史写入的AppendObject可以读取
     * @doc https://cloud.baidu.com/doc/BOS/s/pkcafu76j
     */
    appendObject(
      bucketName: string,
      key: string,
      data: any,
      offset?: number,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 追加写：从字符串追加。
     * @platform Node.js | Browser
     */
    appendObjectFromString(
      bucketName: string,
      key: string,
      data: string,
      offset: number,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 追加写：从浏览器 Blob 追加。
     * @platform Browser
     */
    appendObjectFromBlob(
      bucketName: string,
      key: string,
      blob: Blob,
      offset: number,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 追加写：从本地文件追加。
     * @platform Node.js
     */
    appendObjectFromFile(
      bucketName: string,
      key: string,
      filename: string,
      offset: number,
      size: number,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 追加写：从 base64 DataUrl 追加。
     * @platform Node.js | Browser
     */
    appendObjectFromDataUrl(
      bucketName: string,
      key: string,
      data: string,
      offset: number,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 浏览器在发送跨域请求之前会发送一个preflight请求（OPTIONS）并带上特定的来源域，HTTP方法和Header信息等给BOS以决定是否发送真正的请求，本接口即响应这种请求
     * - 当CORS收到OPTIONS请求后，会读取Bucket对应的CORS规则，然后进行相应的权限检查。整个检查会依次检查每一条规则，使用第一条匹配的规则来允许请求并返回对应的Header。如果所有规则都匹配失败则不附加任何CORS相关的Header。
     * - CORS规则匹配成功必须满足三个条件：
     *    - 请求的Origin必须匹配一项allowedOrigins中一项。
     *    - OPTIONS请求的Access-Control-Request-Method头对应的方法必须匹配一项 allowedMethods中一项。
     *    - OPTIONS请求的Access-Control-Request-Headers头包含的每个Header都必须匹配一项 allowedHeader项(只要有一个不符合则整体失败)。
     * @doc https://cloud.baidu.com/doc/BOS/s/Xl098qh8g
     * @platform Browser
     */
    optionsObject(
      bucketName: string,
      objectName: string,
      options: BosClientAPIOptions & {
        'origin': string;
        'access-control-request-method': string;
        'access-control-request-headers'?: string;
      }
    ): BosResponse;

    /**
     * 获得指定Bucket的Object多版本信息列表
     * @doc https://cloud.baidu.com/doc/BOS/s/Klxudlm8i
     *
     * 示例:
     * ```ts
     * const response = await client.listObjectVersions(
     *   bucketName,
     *   {
     *        maxKeys: 1000,
     *        prefix: "demo-folder",
     *        versionIdMarker: "AJyQ0XRhboY%3D&versions="
     *   }
     * );
     * ```
     */
    listObjectVersions(
      bucketName: string,
      options?: ListObjectOptions & {versionIdMarker?: string}
    ): BosResponse<ListObjectVersionsRes>;

    /** ***********************************************************************************
     *                                  Object权限控制
     ************************************************************************************ */

    /**
     * 获取某个Object的访问权限
     * @doc https://cloud.baidu.com/doc/BOS/s/ekc5ua7o6
     */
    getObjectAcl(bucketName: string, key: string, options?: BosClientAPIOptions): BosResponse<GetObjectAclRes>;

    /**
     * 使用CannedAcl设置Object的访问权限。通过头域的“x-bce-acl"来设置，当前可设置的权限包括：private, public-read（大小写敏感）
     * - 不支持在同一请求中同时设置canned acl和上传ACL文件
     * @doc https://cloud.baidu.com/doc/BOS/s/skc5ue27j
     */
    putObjectCannedAcl(
      bucketName: string,
      key: string,
      cannedAcl: BOSObjectCannedACLType,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 使用ACL文件设置Object的访问权限。ACL文件格式参见[ACL文件格式](https://cloud.baidu.com/doc/BOS/s/Tjwvysda9#%E4%B8%8A%E4%BC%A0acl%E6%96%87%E4%BB%B6%E6%96%B9%E5%BC%8F%E7%9A%84%E6%9D%83%E9%99%90%E6%8E%A7%E5%88%B6)。
     * - 不支持在同一请求中同时设置canned acl和上传ACL文件
     * @doc https://cloud.baidu.com/doc/BOS/s/skc5ue27j
     */
    putObjectAcl(bucketName: string, key: string, acl: string, options?: BosClientAPIOptions): BosResponse;

    /**
     * 删除某个Object的访问权限
     * - 归档存储类型对象在取回未完成，或者刚上传归档类型文件（时长参考取回时长）时，不能删除Object acl。
     * @doc https://cloud.baidu.com/doc/BOS/s/Fkc5uqhqu
     */
    deleteObjectAcl(
      bucketName: string,
      objectName: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<void>, ClientRequest];
    deleteObjectAcl(
      bucketName: string,
      objectName: string,
      options?: BosClientAPIOptions
    ): BosResponse<void>;

    /** ***********************************************************************************
     *                                  Object Select扫描
     ************************************************************************************ */

    /**
     * Bucket中指定object执行SQL语句，选取出指定内容返回。请求者必须对选取的object具有read权限。在SelectObject前需要确保对应的Bucket和Object已经存在，详细信息参考 [SelectObject 开发者文档](https://cloud.baidu.com/doc/BOS/s/pk1rmdy5t)
     * @doc https://cloud.baidu.com/doc/BOS/s/Xkc5t84nz
     */
    selectObject(
      bucketName: string,
      objectName: string,
      body: SelectObjectReq,
      options?: BosClientAPIOptions
    ): BosResponse;

    /** ***********************************************************************************
     *                                  Object软链接
     ************************************************************************************ */

    /**
     * 为BOS已有的目的object（本文档称作"target object"）创建软链接（Symlink），您可以通过该软链接访问目的object
     * @doc https://cloud.baidu.com/doc/BOS/s/Vkd8m19ts
     */
    putSymlink(
      bucketName: string,
      objectName: string,
      target: string,
      overwrite?: boolean,
      options?: BosClientAPIOptions
    ): BosResponse;

    /**
     * 用于获取软链接。此操作需要您对该软链接有读权限。响应头 `x-bce-symlink-target` 指向目标文件。
     * @doc https://cloud.baidu.com/doc/BOS/s/okd8m23n4
     */
    getSymlink(
      bucketName: string,
      objectName: string,
      options?: BosClientAPIOptions
    ): BosResponse<{}, OpenAPIHeaders & {'x-bce-symlink-target': string}>;

    /** ***********************************************************************************
     *                                  分片上传
     ************************************************************************************ */

    /**
     * InitiateMultipartUpload是MultipartUpload的第一步，此命令向BOS请求一个全局唯一的UploadId，用于表示此次MultipartUpload，在MultipartUpload后续两个步骤都需要此UploadId，请求者也可以通过UploadId来查询上传的进度或者中断这次上传操作。
     * - 使用MultipartUpload上传的Object，如不指定Content-Type，BOS会自动识别设置合适的Content-Type，若无法识别则默认为application/octet-stream。
     * - InitiateMultipartUpload获取的UploadId将用于MultiUpload的后续2步操作，也可以用此UploadId来查询整个MultiUpload的进度和中断此次MultiUpload操作。
     * - 获取的UploadId 将用于后续的UploadPartCopy,且copy的源是超过5G的append object，则在init的时候需要设置x-bce-copy-source。copy的源是append object，只能针对超过5G的，如果不足5G不支持。
     * @doc https://cloud.baidu.com/doc/BOS/s/Nkc5uy7ox
     */
    initiateMultipartUpload(
      bucketName: string,
      objectName: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<InitiateMultipartUploadRes>, ClientRequest];
    initiateMultipartUpload(
      bucketName: string,
      objectName: string,
      options?: BosClientAPIOptions
    ): BosResponse<InitiateMultipartUploadRes>;

    /**
     * 在调用 InitiateMultipartUpload 获取 UploadId 后，我们需要用 UploadPart 命令来上传 Object 拆分后的数据（Part）。为了标识各个 Part 在 Object 的相对位置，在 UploadPart 需要指定一个 partNumber 参数，partNumber 的取值范围是 1 - 10000。
     * BOS Part 的大小有一定限制，除最后一个分片外，单个分片最小支持 100 KB，最大支持 5 GB，且整个 Object 大小不超过 48.8 TB。
     * - Node.js 环境用 {@link BosClient.uploadPartFromFile} 或 {@link BosClient.uploadPartFromDataUrl}。
     * - 浏览器环境用 {@link BosClient.uploadPartFromBlob} 或 {@link BosClient.uploadPartFromDataUrl}。
     * @doc https://cloud.baidu.com/doc/BOS/s/3kc5v4qs0
     */
    uploadPart(
      bucketName: string,
      objectName: string,
      uploadId: string,
      partNumber: number,
      partSize: number,
      partFp: ReadStream,
      options?: BosClientAPIOptions
    ): BosResponse<void, {etag: string}>;

    /**
     * 三步上传：从浏览器 Blob 上传分片。
     * @platform Browser
     * @remarks Node.js 环境请改用 {@link BosClient.uploadPartFromFile} 或 {@link BosClient.uploadPart}。
     */
    uploadPartFromBlob(
      bucketName: string,
      key: string,
      uploadId: string,
      partNumber: number,
      partSize: number,
      blob: Blob,
      options?: BosClientAPIOptions
    ): BosResponse<void, {etag: string}>;

    /**
     * 三步上传：从本地文件上传分片。
     *
     * @platform Node.js
     * @remarks 仅 Node.js 环境可用（依赖 `fs` 读取文件）。浏览器环境请改用
     * {@link BosClient.uploadPartFromBlob} 或 {@link BosClient.uploadPartFromDataUrl}。
     */
    uploadPartFromFile(
      bucketName: string,
      objectName: string,
      uploadId: string,
      partNumber: number,
      partSize: number,
      filename: string,
      offset: number,
      options?: {
        headers?: Record<string, any>;
        config?: Record<string, any>;
      }
    ): BosResponse<void, {etag: string}>;

    /**
     * 三步上传：从 base64 DataUrl 上传分片。
     * @platform Node.js | Browser
     */
    uploadPartFromDataUrl(
      bucketName: string,
      key: string,
      uploadId: string,
      partNumber: number,
      partSize: number,
      dataUrl: string,
      options?: BosClientAPIOptions
    ): BosResponse<void, {etag: string}>;

    /**
     * 在调用 InitiateMultipartUpload 获取 UploadId 后，我们需要用 UploadPartCopy 命令来复制 Object 拆分后的数据分片（即 Part）。为了标识各个 Part 在 Object 的相对位置，在 UploadPartCopy 需要指定一个 partNumber 参数，partNumber 的取值范围是 1-10000，即每次三步复制最多可以有 10000 个part，最少 1 个 part。
     * - 每次 Copy Part 最多可以复制 5G Bytes 的数据。
     * - 三步复制得到的目的 Object 的 Meta 信息，不会从源 Object 复制而来，需要用户在 CompleteMultipartUpload 时重新上传，或者完成之后，通过CopyObject接口复制自身来更新Meta。
     * - UploadPartCopy时，不同的part可能来自不同的Object，系统并不对此进行限制。
     * - 目前支持跨区域文件复制，即复制文件所在的源Bucket和目标Bucket可以不在同一region(目前只支持从其它Region向本Region复制数据)。当进行跨区域文件复制时，复制产生的流量会收取跨区域流量费。跨区域收费标准参见产品定价。
     * - 三步复制不适用于Append Object，Append Object可以使用普通复制方法来完成备份和meta更新。
     * - 如果复制的源Object是归档存储类型的，需要首先调用RestoreObject接口取回归档存储类型的Object。
     * @doc https://cloud.baidu.com/doc/BOS/s/fkc5vbii0
     */
    uploadPartCopy(
      sourceBucket: string,
      sourceKey: string,
      targetBucket: string,
      targetKey: string,
      uploadId: string,
      partNumber: number,
      range: string,
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<CopyObjectRes>, ClientRequest];
    uploadPartCopy(
      sourceBucket: string,
      sourceKey: string,
      targetBucket: string,
      targetKey: string,
      uploadId: string,
      partNumber: number,
      range: string,
      options?: BosClientAPIOptions
    ): BosResponse<CopyObjectRes>;

    /**
     * 当请求者用UploadPart将所有的Part都上传完成后，需要用此CompleteMultipartUpload命令完成整个MultipartUpload操作。此命令需要请求提供有效的Part列表，包含part的PartNumber和eTag。BOS收到此命令后会检查数据，然后把所有的Part组合成一个Object。
     * - CompleteMultipartUpload的请求Body最大为1MB。
     * - 一次MultiPart的PartNumber可以是不连续的，比如1, 3, 5。
     * - 如果请求头中同时包含多个条件Header（If-Match、If-None-Match、If-Modified-Since、If-Unmodified-Since），BOS的判断顺序遵循RFC 7232 第六章规定，详情请见RFC 7232。
     * @doc https://cloud.baidu.com/doc/BOS/s/Nkc5vzayc
     */
    completeMultipartUpload(
      bucketName: string,
      objectName: string,
      uploadId: string,
      partList: CompletePart[],
      options: BosClientAPIOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<CompleteMultipartUploadRes, CompleteMultipartUploadHeaders>, ClientRequest];
    completeMultipartUpload(
      bucketName: string,
      objectName: string,
      uploadId: string,
      partList: CompletePart[],
      options?: BosClientAPIOptions
    ): BosResponse<CompleteMultipartUploadRes, CompleteMultipartUploadHeaders>;

    /**
     * 用户可以使用此接口来中断某个MultipartUpload请求，BOS收到此命令后，将会清除已上传的数据。
     * - 中止一个Multipart Upload事件时，如果其所属的某些Part仍然在上传，那么这次中止操作将无法删除这些Part。所以如果存在并发访问的情况，为了彻底释放BOS上的空间，需要调用几次Abort Multipart Upload接口。
     * @doc https://cloud.baidu.com/doc/BOS/s/Wkc5w2ndt
     */
    abortMultipartUpload(
      bucketName: string,
      objectName: string,
      uploadId: string,
      options?: Pick<BosClientAPIOptions, 'config'>
    ): BosResponse<{}>;

    /**
     * 列出用户指定UploadId所属的所有已经上传成功的Part，用户可以通过此命令查看当前的进度。
     * - BOS按照PartNumber升序排序。
     * - 由于网络传输可能出错，所以不推荐用ListParts出来的结果生成最后CompleteMultipartUpload的Part列表。
     * @doc https://cloud.baidu.com/doc/BOS/s/Xkc5w5jmm
     */
    listParts(
      bucketName: string,
      objectName: string,
      uploadId: string,
      options: ListPartsOptions & {config: BosRequestConfig & {requestInstance: true}}
    ): [BosResponse<ListPartsRes, {'content-type': 'application/json; charset=utf-8'}>, ClientRequest];
    listParts(
      bucketName: string,
      objectName: string,
      uploadId: string,
      options?: ListPartsOptions
    ): BosResponse<ListPartsRes, {'content-type': 'application/json; charset=utf-8'}>;

    /**
     * 列出指定Bucket下面的所有未执行完成的Multipart Upload。“未执行完”是指完成了InitMultipartUpload，但是还没有调用CompleteMultipartUpload或AbortMultipartUpload的Multipart Upload。每次BOS最多返回1000个Multipart Upload，BOS支持prefix和delimiter过滤。
     * @doc https://cloud.baidu.com/doc/BOS/s/Ikc5w7snc
     */
    listMultipartUploads(
      bucketName: string,
      options?: {
        params?: {
          uploads?: string;
          delimiter?: string;
          keyMarker?: string;
          maxUploads?: number;
          prefix?: string;
        };
        config?: BosRequestConfig;
      }
    ): BosResponse<ListMultipartUploadsRes>;

    /** ***********************************************************************************
     *                                  通用性接口
     ************************************************************************************ */

    /**
     * 公共读权限对象的 URL 生成
     *
     * @param bucketName 存储桶名称
     * @param objectName 对象名称（对象全路径）
     * @param pipeline 图片处理指令，默认为空
     * @param cdn 使用指定CDN域名生成URL，默认为空
     * @param config 请求配置，可选
     * @returns 生成的URL
     */
    generateUrl(
      bucketName: string,
      objectName: string,
      pipeline?: string,
      cdn?: string,
      config?: BosRequestConfig
    ): string;

    /**
     * 获取带签名的 Object 下载链接
     *
     * @param bucketName 存储桶名称
     * @param objectName 对象名称（对象全路径）
     * @param timestamp 当前ISO时间戳
     * @param expirationInSeconds 过期时间，单位为秒，默认1800秒
     * @param headers 额外添加的HTTP请求头，默认为空
     * @param params 需要额外签名的Query参数，默认为空
     * @param headersToSign 需要额外签名的HTTP请求头，默认为空，默认会对host、content-md5、content-type、content-length进行签名
     * @param config Client配置信息
     */
    generatePresignedUrl(
      bucketName: string,
      objectName: string,
      timestamp?: Date,
      expirationInSeconds?: number,
      headers?: Record<string, any>,
      params?: Record<string, any>,
      headersToSign?: string[],
      config?: BosRequestConfig
    ): string;

    /** 创建文件夹分享链接 */
    createFolderShareUrl(body: CreateFolderShareUrlReq, config?: BosRequestConfig): BosResponse<CreateFolderShareUrlRes>;

    /**
     * 大文件超大对象上传（自动分片 + 并发 + 断点续传）。
     *
     * @platform Node.js | Browser
     * @returns {@link SuperUpload} 上传任务实例，提供 `pause()` / `resume()` / 状态查询等控制能力。
     */
    putSuperObject(params: PutSuperObjectReq): SuperUpload;

    /**
     * @internal 底层请求出口（已签名 / 已构造 URL 的版本）。常用于 SDK 内部分发请求。
     *
     * @param httpMethod 请求方法
     * @param resource   请求 URL origin
     * @param args       请求相关参数
     * @param config     请求配置
     */
    sendHTTPRequest<S = any>(
      httpMethod: HttpMethod,
      resource: string,
      args: BosRequestArgs,
      config: BosClientOptions & BosRequestConfig
    ): BosResponse<S>;
    sendHTTPRequest<S = any>(
      httpMethod: HttpMethod,
      resource: string,
      args: BosRequestArgs,
      config: BosClientOptions & BosRequestConfig & {requestInstance: true}
    ): [BosResponse<S>, ClientRequest];

    /** @internal 生成 PostObject 表单上传所需的 policy 签名。 */
    signPostObjectPolicy(policy: Record<string, any>): {policy: string; signature: string};

    /** @internal 归一化处理BosClientAPIOptions */
    _checkOptions(
      options: BosClientAPIOptions,
      allowedParams?: string[]
    ): {
      config: BosRequestConfig;
      headers: Record<string, any>;
      params: Record<string, any>;
      versionId?: string;
    };

    /** @internal 归一化处理BosClientAPIOptions中的headers */
    _prepareObjectHeaders(options: BosClientAPIOptions): Record<string, any>;
  }
}

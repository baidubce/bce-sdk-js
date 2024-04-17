/**
 * @file src/bos/enums.js
 * @desc BOS Enums
 * @author lurunze
 */

exports.STORAGE_CLASS = {
  /** 标准存储类型 */
  STANDARD: 'STANDARD',
  /** 低频存储 */
  STANDARD_IA: 'STANDARD_IA',
  /** 归档存储 */
  ARCHIVE: 'ARCHIVE',
  /** 冷存储 */
  COLD: 'COLD',
  /** 标准存储-多AZ */
  MAZ_STANDARD: 'MAZ_STANDARD',
  /** 低频存储-多AZ */
  MAZ_STANDARD_IA: 'MAZ_STANDARD_IA'
};

exports.ERROR_CODE = {
  NoSuchUpload: 'NoSuchUpload'
};

exports.DATATYPE = {
  File: 'File',
  Stream: 'Stream',
  Buffer: 'Buffer',
  Blob: 'Blob'
};

exports.STATE = {
  WAITING: 'waiting',
  INITED: 'inited',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

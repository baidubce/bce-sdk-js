/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */

var urlencode = require('urlencode');

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * 列
 * 
 */
var Cell = function Cell() {
  _classCallCheck(this, Cell);

  /**
   * 列名，命名规则满足正则[a-zA-Z_][a-za-z0-9\_]{0,254}
   * @type {string | null}
   */
  this.column = null;
  /**
   * 列值 rawurlencode后的string
   * @type {string | null}
   */

  this.value = null;
};


/**
 * 行
 * 
 */
var Row =
function () {
  function Row() {
    _classCallCheck(this, Row);

    /**
     * 行主键,需要urlencode
     * @type{string | null}
     */
    this.rowkey = null;
    /**
     * cells 每个column, value对的列表
     * @type{Array.Cell | null}
     */

    this.cells = null;
  }

  _createClass(Row, [{
    key: "encode",
    value: function encode(rowKey) {
      return urlencode(rowKey);
    }
  }, {
    key: "addCells",
    value: function addCells(column) {
      var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      this.cells = this.cells || [];
      var newCell = new Cell();
      newCell.column = column;

      if (value !== null) {
        newCell.value = urlencode(value);
      }

      this.cells.push(newCell);
    }
  }]);

  return Row;
}();


/**
 * CreateInstance请求参数结构体
 * 
 */
var CreateInstanceRequest = function CreateInstanceRequest() {
  _classCallCheck(this, CreateInstanceRequest);

  /**
   * 实例默认存储类型,仅支持HighPerformance和CommonPerformance
   * @type {string | null}
   */
  this.storageType = null;
};


/**
 * CreateTable请求参数结构体
 * 
 */
var CreateTableRequest = function CreateTableRequest() {
  _classCallCheck(this, CreateTableRequest);

  /**
   * 建表时固定传0，非0值代表更新表信息。如果不传body，默认为建表
   * @type {number | null}
   */
  this.tableVersion = 0;
  /**
   * 数据压缩方式，可取以下值："NONE"不压缩 "SNAPPY_ALL"使用snappy压缩 ,默认为NONE
   * @type {string | null}
   */

  this.compressType = null;
  /**
   * 数据过期时间，为0时永不过期，单位秒。默认为0，即永不过期
   * @type {number | null}
   */

  this.ttl = null;
  /**
   * 表存储类型,仅支持HighPerformance和CommonPerformance，若无此参数则默认使用Instance中定义的表存储类型
   * @type {string | null}
   */

  this.storageType = null;
  /**
   * 最多保留版本数，取值范围[1, 50000]
   * @type {number | null}
   */

  this.maxVersions = null;
};


/**
 * UpdateTable请求参数结构体
 * 
 */
var UpdateTableRequest = function UpdateTableRequest() {
  _classCallCheck(this, UpdateTableRequest);

  /**
   * 必须先通过GET 获取表的版本信息后，再带入此次请求
   * @type {number | null}
   */
  this.tableVersion = null;
  /**
   * 数据压缩方式，可取以下值："NONE"不压缩 "SNAPPY_ALL"使用snappy压缩 ,默认为NONE
   * @type {string | null}
   */

  this.compressType = null;
  /**
   * 数据过期时间，为0时永不过期，单位秒。默认为0，即永不过期
   * @type {number | null}
   */

  this.ttl = null;
  /**
   * 最多保留版本数，取值范围[1, 50000]
   * @type {number | null}
   */

  this.maxVersions = null;
};


/**
 * PutRow请求参数结构体
 * 
 */
var PutRowRequest =
function () {
  function PutRowRequest() {
    _classCallCheck(this, PutRowRequest);

    /**
     * 行主键，需要rawurlencode
     * @type {string | null}
     */
    this.rowkey = null;
    /**
     * 每个column,value对的列表
     * @type {Array.<Cell> | null}
     */

    this.cells = null;
  }

  _createClass(PutRowRequest, [{
    key: "addCells",
    value: function addCells(column, value) {
      this.cells = this.cells || [];
      var newCell = new Cell();
      newCell.column = column;
      newCell.value = urlencode(value);
      this.cells.push(newCell);
    }
  }, {
    key: "encode",
    value: function encode(rowKey) {
      return urlencode(rowKey);
    }
  }]);

  return PutRowRequest;
}();


/**
 * BatchPutRowRequest 请求体
 * 
 */
var BatchPutRowRequest =
function () {
  function BatchPutRowRequest() {
    _classCallCheck(this, BatchPutRowRequest);

    /**
     * rows
     * @type{Array.<Row> | null}
     */
    this.rows = null;
  }

  _createClass(BatchPutRowRequest, [{
    key: "addRows",
    value: function addRows(rowkey, column, value) {
      this.rows = this.rows || [];
      var newRow = new Row();
      newRow.addCells(column, value);
      newRow.rowkey = newRow.encode(rowkey);
      this.rows.push(newRow);
    }
  }]);

  return BatchPutRowRequest;
}();


/**
 *  DeleteRowRequest 请求体
 *  
 */
var DeleteRowRequest =
function () {
  function DeleteRowRequest() {
    _classCallCheck(this, DeleteRowRequest);

    /**
     * 行主键，需要urlencode
     * @type{string | null}
     */
    this.rowkey = null;
    /**
     * 待删除的column列表
     * @type{Array.<Cell> | null}
     */

    this.cells = null;
  }

  _createClass(DeleteRowRequest, [{
    key: "encode",
    value: function encode(rowKey) {
      return urlencode(rowKey);
    }
  }, {
    key: "addCells",
    value: function addCells() {
      var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      this.cells = this.cells || [];

      if (column != null) {
        var newCell = new Cell();
        newCell.column = urlencode(column);
        this.cells.push(newCell);
      }
    }
  }]);

  return DeleteRowRequest;
}();


/**
 * BatchDeleteRowRequest 请求体
 * 
 */
var BatchDeleteRowRequest =
function () {
  function BatchDeleteRowRequest() {
    _classCallCheck(this, BatchDeleteRowRequest);

    /**
     * rows
     * @type{Array.<Row> | null}
     */
    this.rows = null;
  }

  _createClass(BatchDeleteRowRequest, [{
    key: "addRows",
    value: function addRows(rowkey, column) {
      this.rows = this.rows || [];
      var newRow = new Row();
      newRow.addCells(column);
      newRow.rowkey = newRow.encode(rowkey);
      this.rows.push(newRow);
    }
  }]);

  return BatchDeleteRowRequest;
}();


/**
 *  GetRowRequest 请求体
 *  
 */
var GetRowRequest =
function () {
  function GetRowRequest() {
    _classCallCheck(this, GetRowRequest);

    /**
     * 行主键， 需要rawurlencode
     * @type {string | null}
     */
    this.rowkey = null;
    /**
     * 待查询的column列表
     * @type {Array.<Cell> | null}
     */

    this.cells = null;
  }

  _createClass(GetRowRequest, [{
    key: "encode",
    value: function encode(rowKey) {
      return urlencode(rowKey);
    }
  }, {
    key: "addCells",
    value: function addCells() {
      var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      this.cells = this.cells || [];

      if (column != null) {
        var newCell = new Cell();
        newCell.column = column;
        this.cells.push(newCell);
      }
    }
  }]);

  return GetRowRequest;
}();


/**
 * BatchGetRowRequest 请求体
 * 
 */
var BatchGetRowRequest =
function () {
  function BatchGetRowRequest() {
    _classCallCheck(this, BatchGetRowRequest);

    /**
     * rows
     * @type {Array.<Row> | null}
     */
    this.rows = null;
  }

  _createClass(BatchGetRowRequest, [{
    key: "addRows",
    value: function addRows(rowkey) {
      var column = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      this.rows = this.rows || [];
      var newRow = new Row();

      if (column !== null) {
        newRow.addCells(column);
      }

      newRow.rowkey = newRow.encode(rowkey);
      this.rows.push(newRow);
    }
  }]);

  return BatchGetRowRequest;
}();


/**
 * ScanRequest 请求体
 * 
 */
var ScanRequest =
function () {
  function ScanRequest() {
    _classCallCheck(this, ScanRequest);

    /**
     * scan的起始rowkey，需rawurlencode，不填时默认为表的第一个rowkey
     * @type {string | null}
     */
    this.startRowkey = null;
    /**
     * 是否包含起始rowkey，默认包含
     * @type {bool | null}
     */

    this.includeStart = true;
    /**
     * scan的终止rowkey，需rawurlencode，不填时默认为表的最后一个rowkey
     * @type {string | null}
     */

    this.stopRowkey = null;
    /**
     * 是否包含终止rowkey，默认不包含
     * @type {bool | null}
     */

    this.includeStop = false;
    /**
     * 待查询的column列表，不写默认返回全部列
     * @type{Array<Cell> | null}
     */

    this.selector = null;
    /**
     * 限定查询行数，其值必须为整型，设为其他类型无效
     * @type{int | null}
     */

    this.limit = null;
  }

  _createClass(ScanRequest, [{
    key: "encode",
    value: function encode(rowKey) {
      return urlencode(rowKey);
    }
  }, {
    key: "addCells",
    value: function addCells() {
      var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      this.selector = this.selector || [];

      if (column != null) {
        var newCell = new Cell();
        newCell.column = column;
        this.selector.push(newCell);
      }
    }
  }]);

  return ScanRequest;
}();

module.exports = {
  Cell: Cell,
  Row: Row,
  CreateInstanceRequest: CreateInstanceRequest,
  CreateTableRequest: CreateTableRequest,
  UpdateTableRequest: UpdateTableRequest,
  PutRowRequest: PutRowRequest,
  BatchPutRowRequest: BatchPutRowRequest,
  DeleteRowRequest: DeleteRowRequest,
  BatchDeleteRowRequest: BatchDeleteRowRequest,
  GetRowRequest: GetRowRequest,
  BatchGetRowRequest: BatchGetRowRequest,
  ScanRequest: ScanRequest
};
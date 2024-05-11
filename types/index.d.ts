/**
 * Copyright (c) 2020 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file index.d.ts
 * @author 木休大人 (zhanghao25@baidu.com)
 */

import './bce-config';
import './bos-client';
import './bcc-client';
import './cfc-client';

export = BaiduBce.SDK;

interface SDKGlobal {
  BosClient: BaiduBce.SDK.BosClient;
  BccClient: BaiduBce.SDK.BccClient;
  CfcClient: BaiduBce.SDK.CfcClient;
  // 太多了，慢慢补充吧
}

declare global {
  const baidubce: {sdk: SDKGlobal};
}

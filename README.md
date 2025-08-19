# Baidu Cloud Engine JavaScript SDK

[![Build Status](https://travis-ci.org/baidubce/bce-sdk-js.svg?branch=master)](https://travis-ci.org/baidubce/bce-sdk-js)
[![NPM version](https://img.shields.io/npm/v/@baiducloud/sdk.svg?style=flat)](https://www.npmjs.com/package/@baiducloud/sdk)
[![Coverage Status](https://coveralls.io/repos/github/baidubce/bce-sdk-js/badge.svg?branch=master)](https://coveralls.io/github/baidubce/bce-sdk-js?branch=master)

文档地址：<https://baidubce.github.io/bce-sdk-js/>

## 通过 NPM 安装

```shell
npm install @baiducloud/sdk
```

## 通过 CDN 引用

`${version}`处使用版本号替换，比如`1.0.0-rc.37`

```html
<script src="https://bce.bdstatic.com/lib/@baiducloud/sdk/${version}/baidubce-sdk.bundle.min.js"></script>
```

## 发布

```bash
# 检查已发布版本号
npm view @baiducloud/sdk versions

# 更新版本号
# <version> -- 指定的版本号
npm version <version> --git-tag-version false

# 编译（注意：pack指令已废弃）
npm run build

git add -u .
git commit -m "bump: <version>"

# 发布测试版本
npm publish --tag beta --registry=https://registry.npmjs.org
# 发布正式版本
npm publish --registry=https://registry.npmjs.org

# 发布到CDN
npm run publish:bos
```

#!/usr/bin/env bash

TEST_DIR=$(dirname "$0");
if [ -f "${TEST_DIR}/.env" ]; then
    source "${TEST_DIR}/.env"
fi

export ONLINE_USER_ID=de4b0bd8c0c940939dccada871591da5
export ONLINE_USER_NAME=PASSPORT:16897023

export DEBUG=*.spec

export BOS_ENDPOINT=https://bj.bcebos.com
export BOS_AK=${ONLINE_AK}
export BOS_SK=${ONLINE_SK}

export MEDIA_ENDPOINT=http://media.gz.baidubce.com
export MEDIA_AK=${ONLINE_AK}
export MEDIA_SK=${ONLINE_SK}

export LSS_ENDPOINT=http://lss.bj.baidubce.com
export LSS_AK=${ONLINE_AK}
export LSS_SK=${ONLINE_SK}
# env MEDIA_ENDPOINT=http://media.gz.baidubce.com MEDIA_AK=${ONLINE_AK} MEDIA_SK=${ONLINE_SK} make lss

export BCS_ENDPOINT=https://bs.baidu.com

export SES_ENDPOINT=http://ses.bj.baidubce.com
export SES_AK=${ONLINE_AK}
export SES_SK=${ONLINE_SK}

export OCR_ENDPOINT=http://ocr.bj.baidubce.com
export OCR_AK=${ONLINE_AK}
export OCR_SK=${ONLINE_SK}

export TSDB_DATA_ENDPOINT=http://testdb.tsdb.iot.bj.baidubce.com
export TSDB_ADMIN_ENDPOINT=http://tsdb.bj.baidubce.com
export TSDB_AK=${ONLINE_AK}
export TSDB_SK=${ONLINE_SK}

# QNS问题多多
# env QNS_ENDPOINT=http://qns.bj.baidubce.com QNS_AK=${ONLINE_AK} QNS_SK=${ONLINE_SK} make qns

export FACE_ENDPOINT=http://face.bj.baidubce.com
export FACE_AK=${ONLINE_AK}
export FACE_SK=${ONLINE_SK}

export STS_ENDPOINT=https://sts.bj.baidubce.com
export STS_AK=${ONLINE_AK}
export STS_SK=${ONLINE_SK}

export VOD_ENDPOINT=http://vod.baidubce.com

export DOC_ENDPOINT=http://doc.baidubce.com
export DOC_AK=${ONLINE_AK}
export DOC_SK=${ONLINE_SK}

SPECS=(
  test/sdk/upload_helper.spec.js
  test/sdk/sts.spec.js
  test/sdk/crypto.spec.js
  test/sdk/auth.spec.js
  test/sdk/multipart.spec.js
  test/sdk/http_client.spec.js
  test/sdk/mime.types.spec.js
  test/sdk/bos_client.spec.js
  test/sdk/doc_client.spec.js
  test/sdk/lss_client.spec.js
  test/sdk/mct_client.spec.js
  test/sdk/ses_client.spec.js
  test/sdk/ocr_client.spec.js
  test/sdk/vod_client.spec.js
  test/sdk/vod_client_media.spec.js
  test/sdk/tsdb_data_client.spec.js
  test/sdk/tsdb_admin_client.spec.js
  test/sdk/cfc_client.spec.js
)

# SPECS=(
# test/sdk/vod_client.spec.js
# test/sdk/vod_client_media.spec.js
# )

# node_modules/.bin/mocha ${SPECS[@]}
node_modules/.bin/istanbul cover node_modules/mocha/bin/_mocha --report lcovonly ${SPECS[@]} && cat ./coverage/lcov.info | node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage


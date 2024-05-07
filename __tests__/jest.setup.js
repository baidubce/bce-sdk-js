global.__config__ = {
  bos: {
    endpoint: 'https://bj.bcebos.com',
    bucket: process.env.BOS_TEST_BUCKET,
    ak: process.env.BOS_QA_AK,
    sk: process.env.BOS_QA_SK
  },
  sts: {
    endpoint: 'https://sts.bj.baidubce.com',
    ak: process.env.BOS_QA_AK,
    sk: process.env.BOS_QA_SK
  }
};

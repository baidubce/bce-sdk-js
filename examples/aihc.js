const baidubce = require('../index.js');
require('dotenv').config();

const config = {
  endpoint: 'https://aihc.bj.baidubce.com', //传入所在区域域名
  credentials: {
    ak: process.env['AK'] || '', //您的AccessKey
    sk: process.env['SK'] || '' //您的SecretAccessKey
  }
};

console.log(config);
let client = new baidubce.AihcClient(config);

// client
//   .listResourcepools()
//   .then(function (response) {
//     console.log(JSON.stringify(response.body));
//   })
//   .catch(function (err) {
//     console.log('listInstances failed:', err);
//   });

// client
//   .getResourcepool('cce-e0isdmib')
//   .then(function (response) {
//     console.log(JSON.stringify(response.body));
//   })
//   .catch(function (err) {
//     console.log('listInstances failed:', err);
//   });

client
  .listAIJobs('cce-e0isdmib')
  .then(function (response) {
    console.log(JSON.stringify(response.body));
  })
  .catch(function (err) {
    console.log('listAIJobs failed:', err);
  });

// client
//   .listAIJob('cce-e0isdmib', 'yintao03-48hours-megatron')
//   .then(function (response) {
//     console.log(JSON.stringify(response.body));
//   })
//   .catch(function (err) {
//     console.log('listAIJob failed:', err);
//   });

// client
//   .getAIJobWebterminal('cce-e0isdmib', 'aihc-helper-job-cpu-rs4c4', 'example-container')
//   .then((res) => {
//     console.log(res);
//   })
//   .catch((err) => {
//     console.error(err);
//   });

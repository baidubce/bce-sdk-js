/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const execSync = require('child_process').execSync;

const latestVersion = execSync(`npm info @baiducloud/sdk --registry=https://registry.npmjs.org/ | grep "latest:"`)
    .toString()
    .replace(/^latest:/, '')
    .trim();

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`最近一次的版本为：${latestVersion}\n请输入新的版本号：`, function(version) {
    if (version && /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/.test(version)) {
        const packageJsonPath = path.join(__dirname, '../package.json');

        fs.readFile(packageJsonPath, 'utf8', function(err, data) {
            if (err) {
                console.error(err);
                console.log('\x1b[31m%s\x1b[0m', '❌ [bce-sdk-js] package.json 文件读取失败');
                console.log('\x1b[31m%s\x1b[0m', '❌ [bce-sdk-js] 失败原因：', err);
                rl.close();
                process.exit(1);
            }

            const jsonData = JSON.parse(data);
            jsonData.version = version;
            const newData = JSON.stringify(jsonData, null, 2);

            fs.writeFile(packageJsonPath, newData, 'utf8', function(err) {
                if (err) {
                    console.log('\x1b[31m%s\x1b[0m', '❌ [bce-sdk-js] package.json version更新失败');
                    console.log('\x1b[31m%s\x1b[0m', '❌ [bce-sdk-js] 失败原因：', err);
                    rl.close();
                    process.exit(1);
                } else {
                    console.log('\x1b[32m%s\x1b[0m', '✨ [bce-sdk-js] package.json version更新成功, 版本更新为 ===> ' + version);
                    rl.close();
                    process.exit();
                }
            });
        });

    } else {
        console.log('\x1b[31m%s\x1b[0m', '❌ [bce-sdk-js] 请提供一个合法的版本号，例如1.0.0、1.0.0-beta.0、1.0.0-rc.0等');
        rl.close();
        process.exit(1);
    }
});

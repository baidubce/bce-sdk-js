/**
 * Copyright (c) 2026 Baidu Inc. All Rights Reserved
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 * 
 * @script "rm -rf dist/ && mkdir dist && browserify index.js -s baidubce.sdk -o dist/baidubce-sdk.bundle.js && uglifyjs dist/baidubce-sdk.bundle.js --compress --mangle -o dist/baidubce-sdk.bundle.min.js",
 */
const path = require('path');
const fs = require('fs');

const rimraf = require('rimraf');
const chalk = require('chalk');
const Browserify = require('browserify');
const UglifyJS = require('uglify-js');

function build() {
  const rootPath = path.join(__dirname, '../');
  const inputFile = path.join(rootPath, 'index.js');
  const outputPath = path.join(rootPath, 'dist');
  const outputJS = path.join(outputPath, 'baidubce-sdk.bundle.js');
  const outputMinJS = path.join(outputPath, 'baidubce-sdk.bundle.min.js');

  // 清除构建缓存
  if (fs.existsSync(outputPath)) {
    rimraf.sync(outputPath, {glob: true});
    console.log(chalk.green.bold(`[build] 🗑   cache cleared.`));
  }

  fs.mkdirSync(outputPath);
  console.log(chalk.green.bold(`[build] output folder created`));

  Browserify(inputFile, {standalone: 'baidubce.sdk'})
    .transform('babelify', {
      presets: ['@babel/preset-env'],
      plugins: [
        '@babel/plugin-transform-async-to-generator',
        ['@babel/plugin-syntax-optional-chaining-assign', {version: '2023-07'}],
        '@babel/plugin-transform-nullish-coalescing-operator'
      ]
    })
    .bundle()
    .pipe(fs.createWriteStream(outputJS))
    .on('finish', () => {
      if (fs.existsSync(outputJS)) {
        console.log(chalk.green.bold(`[build] ✨  built success ==> (${outputJS})`));
      }

      // 压缩代码
      const result = UglifyJS.minify(fs.readFileSync(outputJS, 'utf8'), {compress: true});

      if (result.error) {
        throw new Error(chalk.whiteBright.bgRed.bold('[build] UglifyJS failed. ', result.error));
      }

      fs.writeFileSync(outputMinJS, result.code, 'utf8');

      if (fs.existsSync(outputMinJS)) {
        console.log(chalk.green.bold(`[build] ✨  compressed success ==> (${outputMinJS})`));
      }
    });
}

build();

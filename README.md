# node-lei-crawler
简单爬虫工具


## Installation

```bash
$ npm install lei-crawler --save
```


## Usage

**详细参数说明请参考源文件**

```javascript
var crawler = require('lei-crawler');

// 请求页面
var request = crawler.simpleRequest();
function callback (err, contentType, body, $) {
  console.log(err, contentType, body && body.length, $);
}
request({url: 'http://baidu.com'}, callback);
request({url: 'http://baidu.com'}, callback);
request({url: 'http://baidu.com'}, callback);

// 存储引擎
var store = crawler.simpleStore();
store.sAdd('a', [1, 2, 3, 4], function (err) {
  if (err) throw err;
  store.sInter('a', [1, 3, 5, 7], console.log);
});

// 采集URL
crawler.collectURLs({
  name: 't20151007',
  store: exports.simpleStore()
}).start('http://ucdok.com', function (err) {
  console.log('done [err=%s]', err);
  process.exit();
});

// 遍历URL结果
crawler.forEachURL({
  name: 't20151007',
  store: crawler.simpleStore()
}).start(function (url, next) {
  console.log('URL: %s', url);
  next();
}, function (err) {
  console.log('done [err=%s]', err);
  process.exit();
});
```


## License

```
The MIT License (MIT)

Copyright (c) 2015 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var utils = require('./lib/utils');
var simpleRequest = require('./lib/request');
var simpleStore = require('./lib/store');
var collectURLs = require('./lib/collect_urls');

exports.utils = utils;
exports.simpleRequest = simpleRequest;
exports.simpleStore = simpleStore;
exports.collectURLs = collectURLs;


/*
var request = simpleRequest();
function callback (err, body) {
  console.log(err, body && body.length);
}
request({url: 'http://baidu.com'}, callback);
request({url: 'http://baidu.com'}, callback);
request({url: 'http://baidu.com'}, callback);
*/

/*
collectURLs({
  name: 't20151007',
  store: exports.simpleStore()
}).start('http://ucdok.com', function (err) {
  console.log('done [err=%s]', err);
  process.exit();
});
*/

/*
var store = simpleStore({db: 8});
store.sAdd('a', [1, 2, 3, 4], function (err) {
  if (err) throw err;
  store.sInter('a', [1, 3, 5, 7], console.log);
});
*/

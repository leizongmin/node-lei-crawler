/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

exports.utils = require('./lib/utils');

/*
var request = simpleRequest();
function callback (err, body) {
  console.log(err, body && body.length);
}
request({url: 'http://baidu.com'}, callback);
request({url: 'http://baidu.com'}, callback);
request({url: 'http://baidu.com'}, callback);
*/
exports.simpleRequest = require('./lib/request');

exports.simpleStore = require('./lib/store');


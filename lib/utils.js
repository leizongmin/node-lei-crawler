/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var utils = module.exports = exports = require('lei-utils').extend(exports);
var createDebug = require('debug');


utils.debug = function (name) {
  return createDebug('lei-crawler:' + name);
};

utils.merge = function () {
  var list = Array.prototype.slice.call(arguments);
  var ret = {};
  list.forEach(function (obj) {
    for (var i in obj) {
      ret[i] = obj[i];
    }
  });
  return ret;
};

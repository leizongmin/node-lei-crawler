/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var parseUrl = require('url').parse;
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

utils.parseUrl = parseUrl;

utils.getHostNameFromURL = function (url) {
  return parseUrl(url).hostname;
};

utils.getBaseURLFromURL = function getBaseURLFromURL (url) {
  var info = parseUrl(url);
  return info.protocol + '//' + info.hostname;
};

utils.getPathFromURL = function getBaseURLFromURL (url) {
  return parseUrl(url).path;
};

utils.getAbsoluteURL = function (currentURL, url) {
  currentURL = currentURL.trim();
  url = url.trim();
  if (/^[a-zA-Z]+\:/.test(url)) return url;
  if (url[0] === '/' || currentURL[currentURL.length - 1] === '/') {
    return utils.getBaseURLFromURL(currentURL) + url;
  }
  var p = utils.getPathFromURL(currentURL);
  p = path.dirname(p);
  if (p !== '/') p += '/';
  return utils.getBaseURLFromURL(currentURL) + p + url;
};

utils.trim = function (str) {
  return str ? str.trim() : '';
};

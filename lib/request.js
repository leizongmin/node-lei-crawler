/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var request = require('request');
var cheerio = require('cheerio');
var utils = require('./utils');
var debug = utils.debug('request');


module.exports = exports = function (options) {
  var req = new SimpleRequest(options);
  return function () {
    req.request.apply(req, arguments);
  };
};

exports.DEFAULT_TIMEOUT = 10000;
exports.DEFAULT_DELAY = 2000;
exports.DEFAULT_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,fr;q=0.4,sk;q=0.2,zh-TW;q=0.2,ja;q=0.2',
  'Cache-Control': 'max-age=0',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36'
};
exports.DEFAULT_MAX_REDIRECT = 5;
exports.DEFAULT_CACHE_TTL = 3600 * 24 * 7;


function loadURL (options, reqOptions, callback, i) {
  if (isNaN(i)) i = 0;
  debug('loadURL(i=%s) request: %s', i, reqOptions.url);
  var t = Date.now();

  request(reqOptions, function (err, res, body) {
    if (err) return callback(err);
    if (res.headers.location) {
     debug('loadURL(i=%s) redirect: %s => %s', i, reqOptions.url, res.headers.location);
      if (i > options.maxRedirect) {
        return callback(new Error('max redirect'));
      }
      return loadURL(options, reqOptions, callback, i++);
    }

    debug('loadURL(spent=%s) callback: %s', Date.now() - t, reqOptions.url);
    callback(null, body);
  });
}

/**
 * SimpleRequest
 *
 * @param {Object} options
 *   - {Object} headers
 *   - {Number} timeout
 *   - {Number} delay
 *   - {Number} maxRedirect
 *   - {Object} store
 *   - {Number} cacheTTL
 */
function SimpleRequest (options) {
  options = utils.merge({
    timeout: exports.DEFAULT_TIMEOUT,
    delay: exports.DEFAULT_DELAY,
    maxRedirect: exports.DEFAULT_MAX_REDIRECT,
    cacheTTL: exports.DEFAULT_CACHE_TTL
  }, options || {});
  options.headers = utils.merge(exports.DEFAULT_HEADERS, options.headers || {});
  this._options = options;

  this._tasks = [];
  this._lastRequestTimestamp = 0;
  this._taskCounter = 0;
}

SimpleRequest.prototype._wrapCallback = function (callback, options, body) {
  body = body.toString();
  if (options.cheerio) {
    callback(null, body, cheerio.load(body));
  } else {
    callback(null, body);
  }
};

SimpleRequest.prototype._getCacheKey = function (url) {
  return 'cache:html:' + NS('utils').md5(url);
};

SimpleRequest.prototype._getCache = function (url, callback) {
  var self = this;
  if (!self._options.store) return callback(null, null);

  var key = self._getCacheKey(url);
  self._options.store.get(key, callback);
};

SimpleRequest.prototype._setCache = function (url, body, callback) {
  var self = this;
  if (!self._options.store) return callback(null);

  var key = self._getCacheKey(url);
  self._options.store.setCache(key, body, self._options.cacheTTL, callback);
};

/**
 * request
 *
 * @param {Object} options
 *   - {String} url
 *   - {Object} headers
 *   - {Object} cheerio
 */
SimpleRequest.prototype.request = function (options, callback) {
  var self = this;
  options = options || {};
  options.headers = utils.merge(self._options.headers, options.headers);
  options.cheerio = !!options.cheerio;
  if (!options.url) return callback(new TypeError('missing parameter `url`'));

  debug('request[timeout=%s, delay=%s]: url=%s, headers=%j, cheerio=%s',
         self._options.timeout, self._options.delay, options.url, options.headers, options.cheerio);

  self._getCache(options.url, function (err, body) {
    if (err) return callback(err);

    if (body) {
      debug('get from cache: %s', options.url);
      self._wrapCallback(callback, options, body);
    } else {
      debug('add to task list: %s', options.url);
      self._tasks.push({options: options, callback: callback});
      self._process();
    }
  });
};

SimpleRequest.prototype._process = function () {
  var self = this;
  var t = Date.now();
  var v = t - self._lastRequestTimestamp;
  if (v < self._options.delay) {
    setTimeout(function () {
      self._process();
    }, v);
  } else {
    var info = self._tasks.shift();
    var i = self._taskCounter++;
    var t = Date.now();
    debug('process request[#%s]: %s', i, info.options.url);
    self._lastRequestTimestamp = t;
    var options = utils.merge(self._options, {cheerio: info.options.cheerio});
    var reqOptions = {
      url: info.options.url,
      headers: info.options.headers,
      timeout: options.timeout
    };
    loadURL(options, reqOptions, function (err, body) {
      debug('request callback[#%s]: spent=%sms', i, Date.now() - t);
      if (err) return callback(err);

      debug('save cache: %s', reqOptions.url);
      self._setCache(reqOptions.url, body, function (err) {
        if (err) return callback(err);
        self._wrapCallback(info.callback, options, body);
      });
    });
  }
};

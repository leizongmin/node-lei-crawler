/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var Redis = require('ioredis');
var async = require('async');
var utils = require('./utils');
var simpleRequest = require('./request')
var debug = utils.debug('collect_urls');


module.exports = exports = function (options) {
  return new URLCollector(options);
};

// 默认深度
exports.DEFAULT_DEPTH = 1;
// 默认URL列表缓存时间
exports.DEFAULT_CACHE_TTL = 3600 * 24;
// 默认用来筛选符合深度抓取URL的函数
exports.DEFAULT_FILTER_DEPTH = function (url, currentURL) {
  // 默认只抓取站内的数据
  var baseURL = utils.getBaseURLFromURL(currentURL) + '/';
  return (url.indexOf(baseURL) === 0);
};
// 默认用来筛选符合存储条件的URL的函数
exports.DEFAULT_FILTER_RESULT = function (url, currentURL) {
  // 默认收集全部URL
  return true;
};
// 默认request函数
exports.DEFAULT_REQUEST = simpleRequest();


/**
 * URLCollector
 *
 * @param {Object} options
 *   - {String} name
 *   - {Number} depth
 *   - {Number} cacheTTL
 *   - {Function} filterDepth
 *   - {Function} filterResult
 *   - {Object} store
 *   - {Function} request
 */
function URLCollector (options) {
  options = utils.merge({
    depth: exports.DEFAULT_DEPTH,
    cacheTTL: exports.DEFAULT_CACHE_TTL,
    filterDepth: exports.DEFAULT_FILTER_DEPTH,
    filterResult: exports.DEFAULT_FILTER_RESULT,
    request: exports.DEFAULT_REQUEST
  }, options || {});
  this._options = options;

  if (!options.name) return new TypeError('missing parameter `name`');
  if (!options.store) return new TypeError('missing parameter `store`');

  debug('new URLCollector(options=%j)', options);
}

URLCollector.prototype._getRedisKey = function (key) {
  return this._options.name + ':' + key;
};

URLCollector.prototype._getURLCacheKey = function (url) {
  return this._getRedisKey('cache:urls:' + utils.md5(url));
};

URLCollector.prototype._encodeURLValue = function (depth, url) {
  return depth + ':' + url;
};

URLCollector.prototype._decodeURLValue = function (str) {
  var i = str.indexOf(':');
  if (i === -1) return {depth: 0, url: str};
  return {depth: Number(str.slice(0, i)), url: str.slice(i + 1)};
};

URLCollector.prototype._collectPage = function (depth, url, callback) {
  debug('_collectPage[depth=%s]: %s', depth, url);
  var self = this;
  var value = self._encodeURLValue(depth, url);

  self._options.store.sExists(self._getRedisKey('collected'), value, function (err, yes) {
    if (err) return callback(err);
    if (yes) {
      debug('already collected [depth=%s]: %s', depth, url);
      return callback();
    }

    self._loadURL(url, function (err, list) {
      if (err) return callback(err);

      async.series([
        function (next) {

          // 将当前URL设置为已采集过
          debug('collected: %s', url);
          self._options.store.sAdd(self._getRedisKey('collected'), value, next);

        },
        function (next) {

          // 存储深度搜索的URL结果
          var nextDepth = depth - 1;
          if (nextDepth < 0) return next();
          var depthList = list.filter(function (item) {
            return self._options.filterDepth(item, url);
          }).map(function (item) {
            return self._encodeURLValue(nextDepth, item);
          });
          self._options.store.sAdd(self._getRedisKey('wait'), depthList, next);
          debug('add %s URLs to wait list => %j', depthList.length, depthList);

        },
        function (next) {

          // 存储采集到的URL结果
          var resultList = list.filter(function (item) {
            return self._options.filterResult(item, url);
          });

          self._options.store.sInter(self._getRedisKey('finished'), resultList, function (err, finishedList) {
            if (err) return next(err);

            // 仅存储不在finished中的结果
            resultList = resultList.filter(function (item) {
              return (finishedList.indexOf(item) === -1);
            });

            self._options.store.sAdd(self._getRedisKey('result'), resultList, next);
            debug('save %s URLs to result list => %j', resultList.length, resultList);
          });

        }
      ], callback);
    });
  });
};

URLCollector.prototype._loadURL = function (url, callback) {
  var self = this;
  self._loadURLFromCache(url, function (err, list) {
    if (err) return callback(err);
    if (list) return callback(null, list);

    self._loadURLFromRequest(url, callback);
  });
};

URLCollector.prototype._loadURLFromRequest = function (url, callback) {
  var self = this;
  self._options.request({url: url, cheerio: true}, function (err, contentType, body, $) {
    if (err) return callback(err);

    var list = [];
    if (contentType.indexOf('text/html') !== -1) {
      $('a').each(function () {
        var href = utils.trim($(this).attr('href'));
        if (href) {
          list.push(utils.getAbsoluteURL(url, href));
        }
      });
    } else {
      debug('contentType is %s, not text/html, ignore', contentType);
    }

    var key = self._getURLCacheKey(url);
    self._options.store.setCache(key, JSON.stringify(list), self._options.cacheTTL, function (err) {
      callback(err, list);
    });
  });
};

URLCollector.prototype._loadURLFromCache = function (url, callback) {
  var self = this;
  var key = self._getURLCacheKey(url)
  self._options.store.get(key, function (err, data) {
    if (err) return callback(err);
    if (!data) return callback(null, null);

    try {
      data = JSON.parse(data);
    } catch (err) {
      return callback(err);
    }

    callback(null, data);
  });
};

/**
 * start
 *
 * @param {Object} options
 *   - {String} url
 *   - {Number} limit
 */
URLCollector.prototype.start = function (options, callback) {
  options = options || {};
  if (typeof options === 'string') options = {url: options};
  debug('start: options=%j', options);
  if (!options.url) return callback(new TypeError('missing parameter `url`'));

  var self = this;

  function ignoreError (fn) {
    return function (err) {
      if (err) console.error(err);
      var args = Array.prototype.slice.call(arguments);
      args[0] = null;
      fn.apply(null, args);
    };
  }

  async.series([
    function (next) {

      // 为了能正常开始，要将起始页面的URL先从已采集的结果中移除
      var value = self._encodeURLValue(self._options.depth, options.url);
      self._options.store.sRemove(self._getRedisKey('collected'), [value], ignoreError(next));

    },
    function (next) {

      // 删除当前URL的结果缓存，以便能重新开始
      self._options.store.delete(self._getURLCacheKey(options.url), next);

    },
    function (next) {

      // 采集起始URL
      self._collectPage(self._options.depth, options.url, ignoreError(next));

    },
    function (next) {

      var callback = ignoreError(next);

      // 采集wait列表中的URL，直到全部完成
      var counter = 0;
      function nextPage (err) {
        if (err) console.error(err);

        counter++;
        if (options.limit > 0 && counter > options.limit) {
          debug('out of limit (limit=%s)', options.limit);
          return callback();
        }

        self._options.store.sGet(self._getRedisKey('wait'), function (err, data) {
          if (err) callback(err);
          if (!data) {
            debug('end');
            return callback();
          }

          debug('collect URLs #%s data=%j', counter, data);
          data = self._decodeURLValue(data);
          self._collectPage(data.depth, data.url, nextPage);
        });
      }

      nextPage();

    }
  ], callback);
};

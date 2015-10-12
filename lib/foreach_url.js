/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var Redis = require('ioredis');
var async = require('async');
var utils = require('./utils');
var debug = utils.debug('foreach_url');


module.exports = exports = function (options) {
  return new ForEachURL(options);
};


/**
 * ForEachURL
 *
 * @param {Object} options
 *   - {String} name
 *   - {Object} store
 */
function ForEachURL (options) {
  options = options || {};
  this._options = options;

  if (!options.name) return new TypeError('missing parameter `name`');
  if (!options.store) return new TypeError('missing parameter `store`');

  debug('new ForEachURL(options=%j)', options);
}

ForEachURL.prototype._getRedisKey = function (key) {
  return this._options.name + ':' + key;
};

ForEachURL.prototype.start = function () {
  if (arguments.length < 3) {
    var options = {};
    var onItem = arguments[0];
    var onEnd = arguments[1];
  } else {
    var options = arguments[0];
    var onItem = arguments[1];
    var onEnd = arguments[2];
  }
  options = options || {};
  debug('start: options=%j', options);

  var self = this;

  var counter = 0;
  function nextURL (err) {
    if (err) console.error(err);

    self._options.store.sGet(self._getRedisKey('result'), function (err, url) {
      if (err) onEnd(err);
      if (!url) {
        debug('end');
        return onEnd();
      }

      counter++;
      if (options.limit > 0 && counter > options.limit) {
        debug('out of limit (limit=%s)', options.limit);
        return onEnd();
      }

      // 如果已经存在于finished列表中，则忽略
      debug('URL #%s: %s', counter, url);
      self._options.store.sExists(self._getRedisKey('finished'), url, function (err, yes) {
        if (err) return onEnd(err);
        if (yes) {
          debug('already finished: %s', url);
          return nextURL();
        }

        // 等待回调后再将其添加到finished列表
        debug('onItem: %s', url);
        onItem(url, function (err) {
          if (err) return nextURL(err);

          debug('finished: %s', url);
          self._options.store.sAdd(self._getRedisKey('finished'), [url], function (err) {
            if (err) return onEnd(err);
            nextURL();
          });
        });
      });
    });
  }

  nextURL();
};

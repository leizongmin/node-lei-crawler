/**
 * lei-crawler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var Redis = require('ioredis');
var utils = require('./utils');
var debug = utils.debug('store');


module.exports = exports = function (options) {
  return new SimpleStore(options);
};

exports.DEFAULT_HOST = 'localhost';
exports.DEFAULT_PORT = 6379;
exports.DEFAULT_DB = 0;
exports.DEFAULT_PREFIX = 'lei-crawler:';


/**
 * SimpleStore
 *
 * @param {Object} options
 *   - {String} host
 *   - {Number} port
 *   - {Number} db
 *   - {String} prefix
 */
function SimpleStore (options) {
  options = utils.merge({
    host: exports.DEFAULT_HOST,
    port: exports.DEFAULT_PORT,
    db: exports.DEFAULT_DB,
    prefix: exports.DEFAULT_PREFIX
  }, options || {});
  this._options = options;

  var redis = this._redis = new Redis({
    host: options.host,
    port: options.port,
    db: options.db
  });

  debug('new SimpleStore: options=%j', options);
}

SimpleStore.prototype._getKey = function (key) {
  return this._options.prefix + key;
};

SimpleStore.prototype._getValues = function (values) {
  if (!Array.isArray(values)) values = [values];
  return values;
};

SimpleStore.prototype.sAdd = function (name, values, callback) {
  values = this._getValues(values);
  if (values.length < 1) return callback();
  this._redis.sadd(this._getKey(name), values, callback);
};

SimpleStore.prototype.sRemove = function (name, values, callback) {
  values = this._getValues(values);
  if (values.length < 1) return callback();
  this._redis.srem(this._getKey(name), values, callback);
};

SimpleStore.prototype.sExists = function (name, value, callback) {
  this._redis.sismember(this._getKey(name), value, function (err, ret) {
    callback(err, ret > 0);
  });
};

SimpleStore.prototype.sGet = function (name, callback) {
  this._redis.spop(this._getKey(name), callback);
};

SimpleStore.prototype.sAll = function (name, callback) {
  this._redis.smembers(this._getKey(name), callback);
};

SimpleStore.prototype.sCount = function (name, callback) {
  this._redis.scard(this._getKey(name), callback);
};

SimpleStore.prototype.delete = function (name, callback) {
  this._redis.del(this._getKey(name), callback);
};

SimpleStore.prototype.get = function (name, callback) {
  this._redis.get(this._getKey(name), callback);
};

SimpleStore.prototype.set = function (name, value, callback) {
  this._redis.set(this._getKey(name), value, callback);
};

SimpleStore.prototype.setCache = function (name, value, ttl, callback) {
  this._redis.setex(this._getKey(name), ttl, value, callback);
};

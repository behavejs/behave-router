"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

var _interopRequire = function (obj) {
  return obj && (obj["default"] || obj);
};

var ptr = _interopRequire(require("path-to-regexp"));

var each = require("lodash").each;
var uniqueId = require("lodash").uniqueId;
var Route = (function () {
  function Route(path, fn) {
    this.id = uniqueId("route_");
    this.path = path === "*" ? "(.*)" : path;
    this.fn = fn;
    this.regexp = ptr(this.path, this.keys = []);
  }

  _prototypeProperties(Route, null, {
    buildParams: {
      value: function buildParams(url) {
        var params = this.regexp.exec(url).slice(1),
            result = {};

        if (!params) return false;

        each(this.keys, function (k, i) {
          result[k.name] = decodeURIComponent(params[i]);
        });

        return result;
      },
      writable: true,
      enumerable: true,
      configurable: true
    }
  });

  return Route;
})();

module.exports = Route;
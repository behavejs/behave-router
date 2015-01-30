"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

var _get = function get(object, property, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    return desc.value;
  } else {
    var getter = desc.get;
    if (getter === undefined) {
      return undefined;
    }
    return getter.call(receiver);
  }
};

var _interopRequire = function (obj) {
  return obj && (obj["default"] || obj);
};

var auto = require("async").auto;
var waterfall = require("async").waterfall;
var series = require("async").series;
var map = require("lodash").map;
var filter = require("lodash").filter;
var uniqueId = require("lodash").uniqueId;
var assign = _interopRequire(require("object-assign"));

var Route = _interopRequire(require("./lib/route"));

var Router = (function () {
  function Router() {
    var _this = this;
    var options = arguments[0] === undefined ? {} : arguments[0];
    _get(Object.getPrototypeOf(Router.prototype), "constructor", this).call(this);

    this._id = uniqueId("router_");
    this._routes = [];
    this._middleware = [];
    this._unloads = [];
    this._needsUnload = false;
    this._started = false;
    this._eventType = options.eventType || "ROUTE_CHANGE";

    if (!options.dispatcher) throw "no dispatcher given to router: " + this._id;
    this._dispatcher = options.dispatcher;

    this._dispatcher.register(this._id, function (evt) {
      if (_this._started) _this._onPathChange(evt);
    });
  }

  _prototypeProperties(Router, null, {
    use: {
      value: function use(path, fn) {
        this._routes.push(new Route(path, fn));
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    middleware: {
      value: function middleware(fn) {
        this._middleware.push(fn);
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    exit: {
      value: function exit(fn) {
        this._unloads.push(new Route("*", fn));
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    start: {
      value: function start() {
        this._started = true;
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    stop: {
      value: function stop() {
        this._started = false;
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    purge: {
      value: function purge() {
        this._routes.length = 0;
        this._middleware.length = 0;
        this._unloads.length = 0;
        this._needsUnload = false;
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    _onPathChange: {
      value: function OnPathChange(evt) {
        if (evt.type !== this._eventType) return;
        auto({
          pullRoutes: this._pullRoutes.bind(this, evt),
          buildContext: ["pullRoutes", this._buildContext.bind(this)],
          runRoutes: ["buildContext", this._runRoutes.bind(this)]
        }, this._onRoutesComplete.bind(this));
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    _pullRoutes: {
      value: function PullRoutes(evt, cb) {
        var routes, action;

        routes = filter(this._routes, function (r) {
          return r.regexp.test(evt.route);
        });

        action = routes.length ? "enter" : "exit";

        if (this._needsUnload && action === "exit") {
          routes = this._unloads;
          this._needsUnload = false;
        } else {
          this._needsUnload = true;
        }

        cb(null, {
          routes: routes,
          route: evt.route,
          data: evt.data || {}
        });
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    _buildContext: {
      value: function BuildContext(cb, results) {
        var middleware, ctx;

        ctx = assign({}, {
          data: results.pullRoutes.data,
          _router: this,
          _canonicalPath: results.pullRoutes.route
        });

        middleware = map(this._middleware, function (m, i) {
          var result;

          return function (obj) {
            var callback = arguments[arguments.length - 1];
            try {
              result = i === 0 ? m(ctx) : m(obj);
            } catch (e) {
              callback(e);
            }
            callback(null, result);
          };
        });

        waterfall(middleware, function (err, context) {
          if (err) cb(err);
          cb(null, {
            routes: results.pullRoutes.routes,
            route: results.pullRoutes.route,
            context: middleware.length ? context : ctx
          });
        });
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    _runRoutes: {
      value: function RunRoutes(cb, results) {
        var context, routes, route;

        context = results.buildContext.context;
        routes = results.buildContext.routes;
        route = results.buildContext.route;

        routes = map(routes, function (r) {
          var params = r.buildParams(route);

          context.params = params;
          return function (next) {
            r.fn(context);
            next();
          };
        });

        if (!routes.length) return;
        series(routes, function (err) {
          cb(err ? err : null);
        });
      },
      writable: true,
      enumerable: true,
      configurable: true
    },
    _onRoutesComplete: {
      value: function OnRoutesComplete(err) {
        if (err) throw new Error(err);
      },
      writable: true,
      enumerable: true,
      configurable: true
    }
  });

  return Router;
})();

module.exports = Router;
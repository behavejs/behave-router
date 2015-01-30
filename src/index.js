import {auto, waterfall, series} from 'async';
import {map, filter, uniqueId} from 'lodash';
import assign from 'object-assign';
import Route from './lib/route';

class Router {
    constructor(options={}) {
        super();

        this._id = uniqueId('router_');
        this._routes = [];
        this._middleware = [];
        this._unloads = [];
        this._needsUnload = false;
        this._started = false;
        this._eventType = options.eventType || 'ROUTE_CHANGE';

        if (!options.dispatcher) throw `no dispatcher given to router: ${this._id}`;
        this._dispatcher = options.dispatcher;

        this._dispatcher.register(this._id, (evt) => {
            if (this._started) this._onPathChange(evt);
        });
    }

    use(path, fn) {
        this._routes.push(new Route(path, fn));
    }

    middleware(fn) {
        this._middleware.push(fn);
    }

    exit(fn) {
        this._unloads.push(new Route('*', fn));
    }

    start() {
        this._started = true;
    }

    stop() {
        this._started = false;
    }

    purge() {
        this._routes.length = 0;
        this._middleware.length = 0;
        this._unloads.length = 0;
        this._needsUnload = false;
    }

    _onPathChange(evt) {
        if (evt.type !== this._eventType) return;
        auto({
            pullRoutes: this._pullRoutes.bind(this, evt),
            buildContext: ['pullRoutes', this._buildContext.bind(this)],
            runRoutes: ['buildContext', this._runRoutes.bind(this)]
        }, this._onRoutesComplete.bind(this));
    }

    _pullRoutes(evt, cb) {
        var routes, action;

        routes = filter(this._routes, r => {
            return r.regexp.test(evt.route);
        });

        action = (routes.length) ? 'enter' : 'exit';

        if (this._needsUnload && action === 'exit') {

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
    }

    _buildContext(cb, results) {
        var middleware, ctx;

        ctx = assign({}, {
            data: results.pullRoutes.data,
            _router: this,
            _canonicalPath: results.pullRoutes.route
        });

        middleware = map(this._middleware, (m, i) => {
            var result;

            return function(obj) {
                var callback = arguments[arguments.length - 1];
                try { result = (i === 0) ? m(ctx) : m(obj); }
                catch(e) { callback(e); }
                callback(null, result);
            };
        });

        waterfall(middleware, (err, context) => {
            if (err) cb(err);
            cb(null, {
                routes: results.pullRoutes.routes,
                route: results.pullRoutes.route,
                context: (middleware.length) ? context : ctx
            });
        });
    }

    _runRoutes(cb, results) {
        var context, routes, route;

        context = results.buildContext.context;
        routes = results.buildContext.routes;
        route = results.buildContext.route;

        routes = map(routes, (r) => {
            var params = r.buildParams(route);

            context.params = params;
            return (next) => {
                r.fn(context);
                next();
            };
        });

        if (!routes.length) return;
        series(routes, (err) => {
            cb((err) ? err : null);
        });
    }

    _onRoutesComplete(err) {
        if (err) throw new Error(err);
    }
}

export default Router;

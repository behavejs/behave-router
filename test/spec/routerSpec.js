import BehaveRouter from '../../src/index';
import BehaveRoute from '../../src/lib/route';
import sinon from 'sinon';

describe('BehaveRouter', () => {

    beforeEach(() => {
        this.dispatcher = {
            register: sinon.spy(),
            dispatch: sinon.spy()
        };

        this.router = new BehaveRouter({
            dispatcher: this.dispatcher
        });
    });

    describe('.use(path, fn)', () => {

        it('should be defined', (done) => {
            expect(this.router.use).toBeDefined();
            done();
        });

        it('should wrap callback and path in `Route` and push to router\'s routes',
                (done) => {

            this.router.use('test/:route', () => {});
            expect(this.router._routes.length).toEqual(1);
            expect(this.router._routes[0] instanceof BehaveRoute).toBe(true);
            done();
        });
    });

    describe('.middleware(fn)', () => {

        it('should be defined', (done) => {
            expect(this.router.middleware).toBeDefined();
            done();
        });

        it('should push function to router\'s middleware',
                (done) => {

            this.router.middleware(() => {});
            expect(this.router._middleware.length).toEqual(1);
            done();
        });
    });

    describe('.exit(fn)', () => {

        it('should be defined', (done) => {
            expect(this.router.exit).toBeDefined();
            done();
        });

        it('should push function to router\'s unload stack (called when we leave router\'s scope)',
                (done) => {

            this.router.exit(() => {});
            expect(this.router._unloads.length).toEqual(1);
            done();
        });
    });

    describe('.start()', () => {

        it('should be defined', (done) => {
            expect(this.router.start).toBeDefined();
            done();
        });

        it('should set `_started` flag to `true`',
                (done) => {

            this.router.start();
            expect(this.router._started).toBe(true);
            done();
        });
    });

    describe('.stop()', () => {

        it('should be defined', (done) => {
            expect(this.router.stop).toBeDefined();
            done();
        });

        it('should set `_started` flag to `false`',
                (done) => {
            this.router._started = true;
            this.router.stop();
            expect(this.router._started).toBe(false);
            done();
        });
    });

    describe('.purge()', () => {

        it('should be defined', (done) => {
            expect(this.router.purge).toBeDefined();
            done();
        });

        it('should remove all routes, middleware, unloads, and set `_needsUnload` to `false`',
                (done) => {

            this.router.use('some/url', () => {});

            this.router.middleware(() => {});

            this.router.exit(() => {});

            this.router._needsUnload = true;

            expect(this.router._routes.length).toEqual(1);
            expect(this.router._middleware.length).toEqual(1);
            expect(this.router._unloads.length).toEqual(1);

            this.router.purge();

            expect(this.router._routes.length).toEqual(0);
            expect(this.router._middleware.length).toEqual(0);
            expect(this.router._unloads.length).toEqual(0);
            expect(this.router._needsUnload).toBe(false);
            done();
        });
    });

    describe('._onPathChange(evt)', () => {

        beforeEach(() => {
            this.evt = {
                type: 'ROUTE_CHANGE',
                route: 'some/url',
                data: {},
                options: {}
            };
        });

        it('should be defined', (done) => {
            expect(this.router._onPathChange).toBeDefined();
            done();
        });

        it('should exit early if event type is not `this._eventType`',
                (done) => {

            spyOn(this.router, '_pullRoutes').and.callFake(() => {
                return;
            });

            this.evt.type = 'INCORRECT_TYPE';

            this.router.start();
            this.router.use('some/url', () => {});
            this.router._onPathChange(this.evt);

            expect(this.router._pullRoutes).not.toHaveBeenCalled();
            done();
        });

        it('should start loading proper functions to run in routing process',
                (done) => {

            spyOn(this.router, '_pullRoutes').and.callFake(() => {
                return;
            });

            this.router.start();
            this.router.use('some/url', () => {});
            this.router._onPathChange(this.evt);

            expect(this.router._pullRoutes).toHaveBeenCalled();
            done();
        });
    });

    describe('._pullRoutes(evt, cb)', () => {

        beforeEach(() => {
            this.evt = {
                type: 'ROUTE_CHANGE',
                route: 'some/url',
                data: {},
                options: {}
            };
            this.cb = sinon.spy();
        });

        it('should be defined', (done) => {
            expect(this.router._pullRoutes).toBeDefined();
            done();
        });

        it('should filter `_routes` on `evt.route` to determine if it should run them`',
                (done) => {

            this.router.start();
            this.router.use('some/url', () => {});
            this.router._pullRoutes(this.evt, this.cb);

            expect(this.cb.calledWith(null, {
                routes: [this.router._routes[0]],
                route: 'some/url',
                data: {}
            })).toBe(true);
            done();
        });

        it('it should set `_needsUnload` to `true` if routes are found',
                (done) => {

            this.router.start();
            this.router.use('some/url', () => {});
            this.router._pullRoutes(this.evt, this.cb);

            expect(this.router._needsUnload).toBe(true);
            done();
        });

        it('it should pass along _unload methods if `_needsUnload` is `true` and no route matched',
                (done) => {

            this.router.start();
            this.router.exit(() => {});
            this.router._needsUnload = true;
            this.evt.route = 'unregistered/url';
            this.router._pullRoutes(this.evt, this.cb);

            expect(this.cb.calledWith(null, {
                routes: [this.router._unloads[0]],
                route: 'unregistered/url',
                data: {}
            })).toBe(true);
            done();
        });
    });

    describe('._buildContext(cb, results)', () => {

        beforeEach(() => {
            this.results = {
                pullRoutes: {
                    routes: [],
                    route: 'some/url',
                    data: {}
                }
            };

            this.cb = sinon.spy();
        });

        it('should be defined', (done) => {
            expect(this.router._buildContext).toBeDefined();
            done();
        });


        it('should build a context object to be given to each middleware',
                (done) => {

            this.router._buildContext(this.cb, this.results);
            expect(this.cb.called).toBe(true);
            expect(this.cb.calledWith(null, {
                routes: [],
                route: 'some/url',
                context: {
                    data: {},
                    _router: this.router,
                    _canonicalPath: 'some/url'
                }
            }));
            done();
        });
    });

    describe('._buildContext(cb, results)', () => {

        beforeEach(() => {
            this.results = {
                pullRoutes: {
                    routes: [],
                    route: 'some/url',
                    data: {}
                }
            };

            this.cb = sinon.spy();
        });

        it('should be defined', (done) => {
            expect(this.router._buildContext).toBeDefined();
            done();
        });


        it('should build a context object to be given to each middleware',
                (done) => {

            this.router._buildContext(this.cb, this.results);
            expect(this.cb.called).toBe(true);
            expect(this.cb.calledWith(null, {
                routes: [],
                route: 'some/url',
                context: {
                    data: {},
                    _router: this.router,
                    _canonicalPath: 'some/url'
                }
            }));
            done();
        });
    });

    describe('._runRoutes(cb, results)', () => {

        beforeEach(() => {
            this.results = {
                buildContext: {
                    routes: [],
                    route: 'some/url',
                    context: {
                        _router: this.router,
                        _canonicalPath: 'some/url',
                        data: {}
                    }
                }
            };

            this.cb = sinon.spy();
        });

        it('should be defined', (done) => {
            expect(this.router._runRoutes).toBeDefined();
            done();
        });


        it('should run all matched routes, giving them params attached to the context (if any)',
                (done) => {

            var spy = sinon.spy();
            this.router.use('some/:path', spy);
            this.results.buildContext.routes = this.router._routes.slice();
            this.router._runRoutes(this.cb, this.results);

            expect(spy.called).toBe(true);
            expect(spy.calledWith({
                _router: this.router,
                _canonicalPath: 'some/url',
                data: {},
                params: {
                    path: 'url'
                }
            })).toBe(true);
            expect(this.cb.called).toBe(true);
            expect(this.cb.calledWith(null)).toBe(true);
            done();
        });
    });
});

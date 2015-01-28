# behave-router
An ExpressJS style client-side router

[ ![Codeship Status for behavejs/behave-router](https://codeship.com/projects/7e3e9f10-87ec-0132-aada-2af52e5bc1ec/status?branch=master)](https://codeship.com/projects/59297)

Routing is something that can be difficult to implement in browsers. `behave-router` makes dealing with the flow of your application a no-brainer. Tie it together with `behave-history` and `behave-dispatcher`, and you get stateful (in browsers that support `pushState`) routing that lets you easily handle users navigating through your application.


### Installation
```shell
npm install --save behave-router
```

### Usage

```js
import BehaveHistory from 'behave-history';
import BehaveRouter from 'behave-router';
import dispatcher from 'behave-dispatcher';
import TodoStore from './stores/todo';

// should only be one history instance
var history = new BehaveHistory({ dispatcher: dispatcher });

// there can be infinite routers
var router = new BehaveRouter({ dispatcher: dispatcher });

/**
 * use middleware for things you want to happen on every route
 * `ctx` is context object given to every middleware and route
 * `ctx.data` gives you to access to any data sent in dispatch `evt.data` property:
 */

// example of a disptach event for history and router
dispatcher.dispatch({
    // can be any route type you choose
    // just set `eventType` option in router and history, i.e.
    // new BehaveRouter({ dispatcher: dispatcher, eventType: 'CUSTOM_EVENT' });
    type: 'ROUTE_CHANGE',

    // state we are navigating to
    route: 'todos/4/edit',

    // data value is persisted in history state if using `behave-history`
    // and in modern browsers
    // making it accessible when users navigate back and forth in app
    data: { currentUser: user },

    // whether or not to replace history state
    options: { replace: true }
});

// ... in middleware
var todoStore;
router.middleware((ctx) => {
    // ctx.data.currentUser -> user
    // ctx._router -> router instance
    // ctx._canonicalPath -> 'todos/4/edit'
    if (!todoStore) {
        todoStore = new TodoStore();
        dispatcher.register('TodoStore', todoStore.update.bind(todoStore));
    }

    // middleware must return ctx object
    return ctx;
});

/* handle data sanitization in middleware */
router.middleware((ctx) => {
   if (!ctx.data.currentUser) ctx.data.currentUser = (getCurrentUser() || {});
   return ctx;
});

/* set up routes */

// routes support common routing matching patterns, including regex
router.use('todos', (ctx) => {
    var todosView = new Ractive({
        el: 'body',
        data: {
            todos: todoStore.collection.toJS(),
            user: ctx.data.currentUser
        },
        template: templates.index
    });

    todoStore.on('change', () => {
        todosView.set('todos', todoStore.collection.toJS());
    });
});

router.use('todos/:id', (ctx) => {
    // ctx.params.id -> value of :id parameter
    var detailView = new Ractive({
        el: 'body',
        data: {
            todo: todoStore.collection
                .findWhere({ _id: ctx.params.id })
                .toJS(),
            user: ctx.data.currentUser
        },
        template: templates.detail
    });

    todoStore.on('change', () => {
        detailView.set('todo', todoStore.collection
            .findWhere({ _id: ctx.params.id })
            .toJS());
    });
});

router.use('todos/:id/edit', (ctx) => {
    var editView = new Ractive({
        el: 'body',
        data: {
            todo: todoStore.collection
                .findWhere({ _id: ctx.params.id })
                .toJS(),
            user: ctx.currentUser
        }
        template: templates.edit
    });

    todoStore.on('change', () => {
       editView.set('todo', todoStore.collection
            .findWhere({ _id: ctx.params.id })
            .toJS());
    });
});

// example breaking down todoStore and unregistering with dispatcher
// when we leave the router's scope (any routes not in the router)
router.exit((ctx) => {
    if (todoStore) {
        delete todoStore;
        dispatcher.unregister('TodoStore');
    }
});

// example of catching all routes that don't match, and redirecting
// great for small apps with only one router
router.exit((ctx) => {
    // no route matched so must be incorrect url
    console.warn('No route for: ' + ctx._canonicalPath);
    dispatcher.dispatch({
        evt: 'ROUTE_CHANGE',
        route: 'todos',
        data: ctx.data,
        options: {

            // replace window state so we don't get caught in loop
            replace: true
        }
    });
});

/* start up app */
history.start();
router.start();

/* initial route change on page load */
dispatcher.dispatch({
    type: 'ROUTE_CHANGE',
    route: (/^todos/.test(window.locaton.pathname)) ?
        window.location.pathname :
        'todos',
    data: {},
    options: {}
});
```

___

### Testing

Simply run `npm install` and then `npm test` to run tests.

___

### Release History

- 0.1.0 Initial release

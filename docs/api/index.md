# Installation

  Koa requires __node v18.0.0__ or higher for ES2015 and async function support.

  You can quickly install a supported version of Node with your favorite version manager:

```bash
$ nvm install 22
$ npm i koa
$ node my-koa-app.js
```

# Application

  A Koa application is an object containing an array of middleware functions
  which are composed and executed in a stack-like manner upon request. Koa is similar to many
  other middleware systems that you may have encountered such as Ruby's Rack, Connect, and so on -
  however a key design decision was made to provide high level "sugar" at the otherwise low-level
  middleware layer. This improves interoperability, robustness, and makes writing middleware much
  more enjoyable.

  This includes methods for common tasks like content-negotiation, cache freshness, proxy support, and redirection
  among others. Despite supplying a reasonably large number of helpful methods Koa maintains a small footprint, as
  no middleware are bundled.

  The obligatory hello world application:

<!-- runkit:endpoint -->
```js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000);
```

## Cascading

  Koa middleware cascade in a more traditional way as you may be used to with similar tools -
  this was previously difficult to make user friendly with Node's use of callbacks.
  However with async functions we can achieve "true" middleware. Contrasting Connect's implementation which
  simply passes control through series of functions until one returns, Koa invoke "downstream", then
  control flows back "upstream".

  The following example responds with "Hello World", however first the request flows through
  the `x-response-time` and `logging` middleware to mark when the request started, then yields control through the response middleware. When a middleware invokes `next()`
  the function suspends and passes control to the next middleware defined. After there are no more
  middleware to execute downstream, the stack will unwind and each middleware is resumed to perform
  its upstream behaviour.

<!-- runkit:endpoint -->
```js
const Koa = require('koa');
const app = new Koa();

// logger

app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

// response

app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000);
```

## Settings

  Application settings are properties on the `app` instance, currently
  the following are supported:

  - `app.env` defaulting to the __NODE_ENV__ or "development"
  - `app.keys` array of signed cookie keys
  - `app.proxy` when true proxy header fields will be trusted
  - `app.subdomainOffset` offset of `.subdomains` to ignore, default to 2
  - `app.proxyIpHeader` proxy ip header, default to `X-Forwarded-For`
  - `app.maxIpsCount` max ips read from proxy ip header, default to 0 (means infinity)
  - `app.asyncLocalStorage<Boolean|asyncLocalStorage>` - pass `true` or an instance of `AsyncLocalStorage` to enable async local storage. See below for details.

  You can pass the settings to the constructor:
  ```js
  const Koa = require('koa');
  const app = new Koa({ proxy: true });
  ```
  or dynamically:
  ```js
  const Koa = require('koa');
  const app = new Koa();
  app.proxy = true;
  ```

## app.listen(...)

  A Koa application is not a 1-to-1 representation of an HTTP server.
  One or more Koa applications may be mounted together to form larger
  applications with a single HTTP server.

  Create and return an HTTP server, passing the given arguments to
  `Server#listen()`. These arguments are documented on [nodejs.org](http://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback). The following is a useless Koa application bound to port `3000`:

```js
const Koa = require('koa');
const app = new Koa();
app.listen(3000);
```

  The `app.listen(...)` method is simply sugar for the following:

```js
const http = require('http');
const Koa = require('koa');
const app = new Koa();
http.createServer(app.callback()).listen(3000);
```

  This means you can spin up the same application as both HTTP and HTTPS
  or on multiple addresses:

```js
const http = require('http');
const https = require('https');
const Koa = require('koa');
const app = new Koa();
http.createServer(app.callback()).listen(3000);
https.createServer(app.callback()).listen(3001);
```

## app.callback()

  Return a callback function suitable for the `http.createServer()`
  method to handle a request.
  You may also use this callback function to mount your Koa app in a
  Connect/Express app.

## app.use(function)

  Add the given middleware function to this application.
  `app.use()` returns `this`, so is chainable.
```js
app.use(someMiddleware)
app.use(someOtherMiddleware)
app.listen(3000)
```
  Is the same as
```js
app.use(someMiddleware)
  .use(someOtherMiddleware)
  .listen(3000)
```

  See [Middleware](https://github.com/koajs/koa/wiki#middleware) for
  more information.

## app.keys=

  Set signed cookie keys.

  These are passed to [KeyGrip](https://github.com/crypto-utils/keygrip),
  however you may also pass your own `KeyGrip` instance. For
  example the following are acceptable:

```js
app.keys = ['OEK5zjaAMPc3L6iK7PyUjCOziUH3rsrMKB9u8H07La1SkfwtuBoDnHaaPCkG5Brg', 'MNKeIebviQnCPo38ufHcSfw3FFv8EtnAe1xE02xkN1wkCV1B2z126U44yk2BQVK7'];
app.keys = new KeyGrip(['OEK5zjaAMPc3L6iK7PyUjCOziUH3rsrMKB9u8H07La1SkfwtuBoDnHaaPCkG5Brg', 'MNKeIebviQnCPo38ufHcSfw3FFv8EtnAe1xE02xkN1wkCV1B2z126U44yk2BQVK7'], 'sha256');
```

  For security reasons, please ensure that the key is long enough and random.

  These keys may be rotated and are used when signing cookies
  with the `{ signed: true }` option:

```js
ctx.cookies.set('name', 'tobi', { signed: true });
```

## app.context

  `app.context` is the prototype from which `ctx` is created.
  You may add additional properties to `ctx` by editing `app.context`.
  This is useful for adding properties or methods to `ctx` to be used across your entire app,
  which may be more performant (no middleware) and/or easier (fewer `require()`s)
  at the expense of relying more on `ctx`, which could be considered an anti-pattern.

  For example, to add a reference to your database from `ctx`:

```js
app.context.db = db();

app.use(async ctx => {
  console.log(ctx.db);
});
```

Note:

- Many properties on `ctx` are defined using getters, setters, and `Object.defineProperty()`. You can only edit these properties (not recommended) by using `Object.defineProperty()` on `app.context`. See https://github.com/koajs/koa/issues/652.
- Mounted apps currently use their parent's `ctx` and settings. Thus, mounted apps are really just groups of middleware.

## app.currentContext

> New in Koa v3.

If `asyncLocalStorage` is enabled, this will return the current context for the request. For example:

```js
const app = new Koa({ asyncLocalStorage: true })

app.use(async (ctx, next) => {
  callSomeFunction()
})

function callSomeFunction () {
  app.currentContext = {} /* ctx of the middleware above */
}
```

Starting in v3.1.0, you can also pass your own AsyncLocalStorage instance:

```js
const asyncLocalStorage = new AsyncLocalStorage()
const app = new Koa({ asyncLocalStorage })

app.use(async (ctx, next) => {
  callSomeFunction()
})

function callSomeFunction () {
  const ctx = asyncLocalStorage.getStore()
}
```

Use this to pass key request details like request ID or the user to your internal services.

## Error Handling

  By default outputs all errors to stderr unless `app.silent` is `true`.
  The default error handler also won't output errors when `err.status` is `404` or `err.expose` is `true`.
  To perform custom error-handling logic such as centralized logging you can add an "error" event listener:

```js
app.on('error', err => {
  log.error('server error', err)
});
```

  If an error is in the req/res cycle and it is _not_ possible to respond to the client, the `Context` instance is also passed:

```js
app.on('error', (err, ctx) => {
  log.error('server error', err, ctx)
});
```

  When an error occurs _and_ it is still possible to respond to the client, aka no data has been written to the socket, Koa will respond
  appropriately with a 500 "Internal Server Error". In either case
  an app-level "error" is emitted for logging purposes.

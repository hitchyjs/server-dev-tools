# hitchy-server-dev-tools

_toolkit for testing plugins and applications basing on [Hitchy](https://www.npmjs.com/package/hitchy)_

This module is mostly exposing a simplified API for running a Hitchy-based application in current process. It is used to test such an application's API as well as testing plugins for Hitchy and their affects on different Hitchy-based applications depending on them.

Starting with v0.2.0 of this package Hitchy v0.6.0 is used which is introducing a revised set of tools for testing applications and plugins. As a result test implementations become easier and more useful.

## License

[MIT](LICENSE)

## Installation

Always install this package _as a development dependency_:

```bash
npm i -D hitchy-server-dev-tools
```

### On Plugin Development

When developing a plugin for Hitchy it should never depend on [Hitchy](https://www.npmjs.com/package/hitchy) directly. In development environment Hitchy is fetched as a dependency by using this module instead. For production use your plugin should mark **hitchy** as a peer dependency.

## Usage

These tools expose methods for easily starting and stopping an instance of Hitchy in current process. You can pass options and arguments into started Hitchy application. In addition, this toolkit is obeying some additional options on managing context provided for running the application. 

### Terminology

Basically it is important to distinguish two kinds of projects this toolkit may be used with:

* A Hitchy-based application is a final piece of work. It will be installed by users of that application. It isn't used as part of another application except for interacting with it via network requests.

* A plugin for Hitchy is meant to be listed as a dependency of such an application. Thus, it is capable to run in context of many applications probably providing each one with a slightly different functionality.

It is important to know folders involved:

* The _project folder_ is a folder assumed to contain a Hitchy-based application's implementation.

* The optional _plugin folder_ is assumed to contain the plugin which must be discovered by resulting application.

Neither folder must be in scope of the other.

### Common Behaviour

The toolkit is temporarily running an instance of Hitchy in context of a given folder. It is exposing API for easily starting and stopping it, mostly in context of a test runner. 

It supports picking an existing folder on disk or describing its content to be compiled in a temporary folder before starting Hitchy eventually. In addition, by combining both use cases, files of selected folder are copied to some temporary folder prior to adjusting latter folder according to given 
file content descriptions.

Last but not least, a CLI tool helps with fetching peer dependencies of your plugin.

### Testing Application API

A Hitchy-based application usually focuses on exposing an API over HTTP. For unit testing this API the application must be started and stopped before and after running any test suite.

Assuming there is a Hitchy-based project in folder

    /path/to/my/app

Its tests may reside in 

    /path/to/my/app/test

One of the files in that folder could be named **example.spec.js**. The following code is an example for a simple unit test to be run with [mocha](https://mochajs.org/):

```javascript
const Path = require( "path" );

const { describe, before, after, it } = require( "mocha" );
const ServerDevTools = require( "hitchy-server-dev-tools" );
require( "should" );

describe( "A controller of my app", () => {
	const ctx = {};

	before( ServerDevTools.before( ctx, {
		testProjectFolder: Path.join( __dirname, ".." ),
		options: { ... }
	} ) );

	after( ServerDevTools.after( ctx ) );

	it( "properly responds to incoming query", () => {
		return ctx.post( "/some/url", {
			prop: "value",
		} )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
			} );
	} );
} );
```

In this example, toolkit option **testProjectFolder** is picking root folder of project also containing this test file.

### Testing Hitchy Plugin

Testing a plugin is slightly different from testing an application:

* A plugin isn't bound to a particular project folder. Instead, you need to provide a fake project which claims to depend on the plugin to be tested.

* Different applications might use the same plugin for different use cases. The plugin might behave differently depending on its including application. Thus, proper unit testing requires different projects to test the plugin with. Either project must be faked most probably.

* The project containing a test suite is implementing the plugin, only. It gets integrated with an application as a dependency residing in that application's **node_modules/** folder by design. Due to faking multiple project folders, the plugin gets injected explicitly every time.

Assuming you are developing a plugin in folder 

    /path/to/my/plugin

There may be tests in 

    /path/to/my/plugin/test/scripts

Fake project folders could be implemented in

    /path/to/my/plugin/test/projects

just like

    /path/to/my/plugin/test/projects/candidate-a

A resulting test script **/path/to/my/plugin/test/scripts/example.spec.js** should look like this:

```javascript
const Path = require( "path" );

const { describe, before, after, it } = require( "mocha" );
const ServerDevTools = require( "hitchy-server-dev-tools" );
require( "should" );

describe( "An application relying on my plugin", () => {
	const ctx = {};

	before( ServerDevTools.before( ctx, {
		pluginFolder: Path.join( __dirname, "../.." ),
		testProjectFolder: Path.join( __dirname, "../project/candidate-a" ),
		options: { ... }
	} ) );

	after( ServerDevTools.after( ctx ) );

	it( "handles request properly", () => {
		return ctx.post( "/some/url", {
			prop: "value",
		} )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
			} );
	} );
} );
```

This example is different from the previous one for testing application in toolkit options provided:

* **testProjectFolder** is selecting a fake project folder instead of current project's root folder.
* **pluginFolder** is picking root folder of plugin's project this test is a part of. This way Hitchy will discover the plugin on running in context of fake application in fake project folder.

#### Describing Project Folders

Due to relying on existing fake project folders on disk, implementing unit tests for a plugin may be hard to manage. That's why this toolkit supports self-contained unit tests by describing the desired project folder's content to be written to disk temporarily:

```javascript
const Path = require( "path" );

const { describe, before, after, it } = require( "mocha" );
const ServerDevTools = require( "hitchy-server-dev-tools" );
require( "should" );

describe( "An application relying on my plugin", () => {
    const ctx = {};

    before( ServerDevTools.before( ctx, {
        pluginFolder: Path.join( __dirname, "../.." ),
        files: {
            "config/routes.js": `exports.routes = { "/foo": ( _, res ) => res.send( "Hello!" ) };`,
        }, 
        options: { ... }
    } ) );

    after( ServerDevTools.after( ctx ) );

    it( "handles request properly", () => {
        return ctx.get( "/foo" )
            .then( response => {
                response.body.toString( "utf8" ).should.be.equal( "Hello!" );( 200 );
            } );
    } );
} );
```

In this example toolkit option **files** is used to provide temporary content for a file to be injected into some temporary project folder. Of course, multiple files may be provided that way.

Combining those two approaches helps with eliminating redundancies. An existing project folder on disk could serve as a common template for several test cases. Either test suite is describing content of files differing from that template, only. The toolkit will copy the selected project folder to temporary location and adjust files according to provided file descriptions afterwards.  


### Test Runner Requirements

This toolkit does not rely on mocha for running your tests. It works just fine without any particular test runner as demonstrated in this example:

```javascript
const Path = require( "path" );
const Assert = require( "assert" );

const { before, after } = require( "hitchy-server-dev-tools" );

const ctx = {};

before( ctx, {
	pluginFolder: Path.join( __dirname, "../.." ),
	testProjectFolder: Path.join( __dirname, "../project/candidate-a" ),
} )()
	.then( () => {
		return ctx.put( "/exposed/route/of/hitchy?foo=bar", { 
			prop: "some info",
		} )
			.then( response => {
				Assert.strictEqual( response.statusCode, 200, "HTTP status code must be 200" );
			} );
	} )
	.finally( after( ctx ) );
```

However, using test runners like mocha is suggested e.g. for conveniently performing multiple tests in scope of a single run of Hitchy. 


## API

### before( context, toolkitOptions ): Function

This method is generating function for use with test runners on preparing test suites. This is the suggested way as of v0.2.0. 

This use case is demonstrated in code examples provided above.

This method requires provision of [context descriptor](#context-descriptor) and [toolkit options](#toolkit-options). See the examples given above for some demonstration.

### after( context ): Function

This method is generating function for use with test runners on tearing down test suites. It is the suggested way as of v0.2.0.

The method requires provision of same [context descriptor](#context-descriptor) as provided on calling [before()](#before-context-toolkitoptions--function).

Code examples provided above are illustrating how to use it.

### start( toolkitOptions ): Promise&lt;context>

> Starting with v0.2.0 this method is still available, though using `before()` should be preferred.

This method is starting Hitchy instance serving project selected in mandatory set of [toolkit options](#toolkit-options). It is returning promise resolved with runtime information on properly started server processing HTTP requests using some Hitchy instance. 

As of v0.4.1 of Hitchy (or v0.1.4 of this package) the started server is exposing Hitchy's API as `server.$hitchy`. 

As of v0.6.0 of Hitchy (or v0.2.0 of this package) the promised information returned here is an object consisting of the web server instance in property `server` and the related Hitchy instance in property `hitchy`.

### stop( instance ): Promise

> Starting with v0.2.0 this method is still available, though using `after()` should be preferred.

This method takes the runtime information promised by a previous invocation of method `start()` to shut down that server instance properly. For your convenience providing promise returned by method `start()` is supported as well.

The method is returning another promise resolved when Hitchy instance has been shut down properly.

### query

This API has been removed as of v0.2.0 due to its limited and thus error-prone singleton approach.

### request( method, route, body, headers )

> This method is exposed to keep providing some basic support for use cases previously depending on `query` API which has been removed as of v0.2.0.

This method is sending a request via HTTP to [manually bound](#manual-binding) Hitchy instance using provided HTTP method, some route into the instance as well as some optional body data and custom HTTP request headers.

The request data in `body` might be string, instance of `Buffer` or some arbitrary data to be converted to JSON string.

The method is returning Promise resolved with completely consumed response. This response is basically an HTTP response object commonly supported by NodeJS. It is though qualified with some additional properties:

* The raw response body is included as a `Buffer` in property `body`. 
* If response headers indicate JSON-formatted response the parsed object is exposed in property `data` of promised response.
* If response headers indicate some textual content it is exposed in property `text` if promised response.

#### Manual Binding

You must call this method manually bound to context descriptor promised by `start()` like this:

```javascript
const Assert = require( "assert" );

const { start, stop, request } = require( "hitchy-server-dev-tools" );
 
start( {
    pluginFolder: Path.join( __dirname, "../.." ),
    testProjectFolder: Path.join( __dirname, "../project/candidate-a" ),
} )
    .then( ctx => { 
        return request.call( ctx, "PUT", "/exposed/route/of/hitchy?foo=bar", {
            prop: "some info",
        } )
            .then( response => {
                Assert.strictEqual( response.statusCode, 200, "HTTP status code must be 200" );
            } )
            .finally( () => stop( ctx ) );
    } );
```


## Toolkit Options

The toolkit supports the following set of options for controlling context of running Hitchy instances.

* **testProjectFolder** provides pathname of project folder Hitchy is processing. It is basically equivalent to Hitchy's option **projectFolder**, though the former is preferred over the latter.

  You always must provide either toolkit's **tesrProjectFolder** or Hitchy's **projectFolder**.

* **pluginsFolder** optionally provides pathname of folder containing plugin to be discovered by Hitchy explicitly. 

  This option is required on testing plugins. Usually, it isn't used in testing applications.

* **files** is an object mapping relative pathnames of files into either file's content to be written to temporary project folder. When combining with **testProjectFolder** a copy of that folder is created first.

  This option is useful on testing plugins. Usually, it isn't used in testing applications.

* **useTmpPath** is a boolean controlling whether creating temporary copy of selected project folder or not. 

  When setting **files** toolkit option, a temporary folder is created without regards to this option.

* **options** contains options forwarded to Hitchy. See [Hitchy's manual](https://hitchyjs.github.io/core/api/hitchy.html#options) for options basically supported here. In addition, any plugin or application may support additional options.


## Context Descriptor

Using methods [before](#before-context-toolkitoptions--function) and [after](#after-context--function) a _context descriptor_ is managed addressing running instance of Hitchy as well as exposing tools for interacting with it more conveniently. Usually, this is an empty object passed into [before](#before-context-toolkitoptions--function) to be populated. The same descriptor must be used with [after](#after-context--function) so it is tearing down the Hitchy instance set up before.

After function generated by [before](#before-context-toolkitoptions--function) has finished the descriptor contains these properties:

* **server** is referring to the HTTP server set up for handling incoming requests to be dispatched into Hitchy instance.

* **hitchy** is referring to the Hitchy instance itself. Using **hitchy.api** the instance's API is available for inspection. You shouldn't use this reference for anything but inspecting state of Hitchy at runtime.

* **temporaryFolder** is pathname of temporary project folder managed by server dev tools. It might be `undefined` in case of using some existing folder on disk.
 
* **logged** is a list of messages logged to console.

* **options** exposes the set of Hitchy options eventually used for starting its instance.

* **request()** is exposing common HTTP client for emitting requests implicitly addressing running Hitchy instance. The signature is identical to [request()](#request-method-route-body-headers-), but this time you don't need to bind it manually.

* **get()** is wrapping **request()** listed before with its first parameter implicitly bound to `"GET"`.

* **post()** is wrapping **request()** listed before with its first parameter implicitly bound to `"POST"`.

* **put()** is wrapping **request()** listed before with its first parameter implicitly bound to `"PUT"`.

* **patch()** is wrapping **request()** listed before with its first parameter implicitly bound to `"PATCH"`.

* **delete()** is wrapping **request()** listed before with its first parameter implicitly bound to `"DELETE"`.

* **head()** is wrapping **request()** listed before with its first parameter implicitly bound to `"HEAD"`.

* **options()** is wrapping **request()** listed before with its first parameter implicitly bound to `"OPTIONS"`.

* **trace()** is wrapping **request()** listed before with its first parameter implicitly bound to `"TRACE"`.


## CLI Tools

Starting with version 0.1.0 there is a tool named `hitchy-pm` that can be used in projects to fetch all peer dependencies of your project e.g. prior to running unit tests in a CI setup.

`hitchy-pm` takes a list of peer dependencies and checks whether they exist in current project or not. It is installing all missing dependencies using `npm` with `--no-save` option.

```bash
hitchy-pm hitchy-plugin-auth hitchy-plugin-session hitchy-plugin-cookies hitchy-odem
``` 

The tool is qualifying all provided names of peer dependencies, so it's okay to omit the prefix `hitchy-plugin-` on every listed dependency for sake of readability.

```bash
hitchy-pm auth session cookies hitchy-odem
```

> Omitting prefix does not work unless it is exactly matching `hitchy-plugin-`.

Additional parameters are:

| parameter | description |
|-----------|-------------|
| `--quiet` | Suppresses output not related to some malfunction. |
| `--exec`  | This option ends list of parameters processed by hitchy-pm itself and starts collection of command name and its arguments to be invoked after having installed all missing dependencies. |
| `--resolve` | **Not yet supported.**<br><br>This is going to use smarter approach inspecting current project's configuration and configuration of all its dependencies recursively to find the required peer dependencies. |

### Examples

```bash
hitchy-pm auth session cookies hitchy-odem --exec mocha --recursive --ui bdd test/scripts
```

This line is checking whether listed Hitchy plugins are available. If all dependencies exist or either missing dependency has been installed the command is invoking mocha with given arguments to run some tests.

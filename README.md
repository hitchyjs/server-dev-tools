# hitchy-server-dev-tools

developer tools for extending [Hitchy](https://www.npmjs.com/package/hitchy) or testing Hitchy-based applications

This module is mostly exposing a simplified API for running a Hitchy-based application in current process e.g. for testing its API. This is very useful for testing such an application's API as well as testing a Hitchy extension and how it affects the routing in different Hitchy-based applications.

## License

[MIT](LICENSE)

## Installation

Always install this package _as a development dependency_:

```bash
npm i -D hitchy-server-dev-tools
```

When developing an extension for Hitchy this extension should never depend on [Hitchy](https://www.npmjs.com/package/hitchy) directly. In development environment Hitchy is fetched as a dependency by using this module, though. For production use your extension should mark hitchy as a peer dependency instead.

## Usage

These tools expose methods for easily starting and stopping an instance of Hitchy in current process. This instance is customized to use the following folders:

* The _project folder_ is a folder assumed to contain a Hitchy-based application's implementation.

* The _extension folder_ is optional and it is assumed to contain the extension which has to be discovered by resulting application explicitly.

Neither folder must be in scope of the other. The extension folder is optional for testing your Hitchy-based application. 

### Testing Application API

When developing application with HitchyJS this mostly consists of exposing an API over HTTP. Adopting patterns of unit tests this requires to start the application before running the tests and stop it properly afterwards.

Consider having a Hitchy-based project in folder

    /home/me/dev/fancy-hitchy-app

Its tests might be found in 

    /home/me/dev/fancy-hitchy-app/test

One of these tests is **example.spec.js** and it might look like this while relying on [mocha](https://mochajs.org/):

```javascript
const Path = require( "path" );

const { describe, before, after, it } = require( "mocha" );
const { start, stop, query } = require( "hitchy-server-dev-tools" );
require( "should" );

describe( "some test", () => {
	let server;

	before( () => {
		return start( {
			testProjectFolder: Path.join( __dirname, ".." ),
			options: { ... }
		} )
		.then( s => { server = s; } );
	} );

	after( () => stop( server ) );

	it( "succeeds", () => {
		return query.post( "/some/url", {
			prop: "value",
		} )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
			} );
	} );
} );
```

The provided **testProjectFolder** should address the containing application's root folder.

### Testing Hitchy Extension

Testing extensions for Hitchy works quite similarly as testing a containing application. Significant differences are:

* You need to provide a fake project implementing some prototype application based on Hitchy.

* This time the containing project is implementing an extension for use with applications, only. Thus, the extension is no implicit part of Hitchy-based application to be run. That's why the containing extension's folder must be provided explicitly so Hitchy is obeying it on looking for existing extensions.

So, assuming you are developing an extension in folder 

    /home/me/dev/fancy-hitchy-extension

there may be tests in 

    /home/me/dev/fancy-hitchy-extension/test/scripts

You might want to test the extension in context of several mock-up projects which reside in


    /home/me/dev/fancy-hitchy-extension/test/projects

just like

    /home/me/dev/fancy-hitchy-extension/test/project/candidate-a

A resulting test script **example.spec.js** should look like this:

```javascript
const Path = require( "path" );
const { start, stop, query } = require( "hitchy-server-dev-tools" );

start( {
	extensionFolder: Path.join( __dirname, "../.." ),
	testProjectFolder: Path.join( __dirname, "../project/candidate-a" ),
} )
	.then( server => {
		return query.put( "/exposed/route/of/hitchy?foo=bar", { 
			prop: "some info",
		} )
			.then( response => {
				// TODO: assess the response as provided from Hitchy 
				// service on querying given route here ...
			} )
			.then( 
				() => stop( server ), 
				() => stop( server ) 
			);
	} );
```

In opposition to example above this one does not rely on mocha. Using mocha is possible as well. The main difference is the way folders are selected.

## API

### start( { testProjectFolder, extensionFolder, options } )

Starts Hitchy instance serving selected test project obeying extension in separately provided folder as well as all its dependencies on discovering Hitchy extensions. Any custom option in `options` is passed into Hitchy's set of options.

The method is returning Promise resolved with Hitchy instance started properly.

### stop( instance )

This method takes the server instance promised by a previous invocation of method `start()` to shut down that server instance properly.

The method is returning Promise resolved on Hitchy instance shut down properly.

### query

Exposed collection `query` contains several methods available for emitting requests sent to most recently started Hitchy instance.

#### query.request( method, route, body, headers )

This method is sending a request via HTTP to most recently started Hitchy instance using provided HTTP method, some route into the instance as well as some body data and custom HTTP request headers.

The request data in `body` might be string, Buffer or some arbitrary data with the latter implicitly converted to JSON string.

The method is returning Promise resolved with completely consumed response. This response is basically an HTTP response object commonly supported by NodeJS. It is though qualified with some additional properties:

* The raw response body is included as a Buffer in property `body`. 
* If response headers indicate JSON-formatted response the parsed object is exposed in property `data` of promised response.
* If response headers indicate some textual content it is exposed in property `text` if promised response.

#### query.get( route, data, headers )

This is an alias of `query.request` with leading parameter `method` bound to `GET`.

> Note! HTTP GET requests don't have a request body by intention. So don't use `data` in any request and pass `null` here when requiring to set some custom request headers.

#### query.post( route, data, headers )

This is an alias of `query.request` with leading parameter `method` bound to `POST`.

#### query.put( route, data, headers )

This is an alias of `query.request` with leading parameter `method` bound to `PUT`.

#### query.delete( route, data, headers )

This is an alias of `query.request` with leading parameter `method` bound to `DELETE`.

## CLI tools

Starting with version 0.1.0 there is a tool named `hitchy-pm` that can be used in projects to fetch all peer dependencies of your project e.g. prior to running unit tests in a CI setup.

`hitchy-pm` takes a list of peer dependencies and checks whether they exist in current project or not. Missing dependencies are installed using `npm` with `--no-save` option.

```bash
hitchy-pm hitchy-plugin-auth hitchy-plugin-session hitchy-plugin-cookies hitchy-odem
``` 

Names of peer dependencies are qualified so it's okay to omit the prefix `hitchy-plugin-` on every listed dependency.

```bash
hitchy-pm auth session cookies hitchy-odem
```

You can't omit prefix unless it is exactly matching `hitchy-plugin-`.

Additionally supported parameters are:

| parameter | description |
|-----------|-------------|
| `--quiet` | Suppresses output not related to some malfunction. |
| `--exec`  | This option ends list of parameters processed by hitchy-pm itself and starts collection of command name and its arguments to be invoked after having installed all missing dependencies. |
| `--resolve` | **Not yet supported.** This is going to use smarter approach inspecting current project's configuration and configuration of all its dependencies recursively to find the required peer dependencies. |

### Examples

```bash
hitchy-pm auth session cookies hitchy-odem --exec mocha --recursive --ui bdd test/scripts
```

This line is checking whether listed hitchy extensions are available. If all dependencies exist or either missing dependency has been installed the comamnd is invoking mocha with given arguments to run some tests.

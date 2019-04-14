# hitchy-server-dev-tools

collection of tools for developing Hitchy extensions

This module is basically wrapping Hitchy itself exposing a small set of simple functions enabling control of Hitchy in context of developing and testing some extension for hitchy. It is intended to boost extension development by simplifying project setup and motivating development of tests.

## License

[MIT](LICENSE)

## Installation

Install this package as a development dependency in your project for developing an extension for Hitchy.

```bash
npm i -D hitchy-server-dev-tools
```

### Depending on Hitchy

By using this module as a development dependency there is no need to make your extension project directly depend on Hitchy. Use a peer dependency instead!

## Usage

### Testing Support

This module exposes methods for easily starting and stopping an instance of Hitchy equipped with your project's extension to serve a test application in a specific folder.

Consider your extension project to reside in folder 

    /home/me/dev/fancy-hitchy-extension

If you want to test this you need a running Hitchy instance which is serving a particular project with routes implemented to use your extension so you can run tests by querying Hitchy. That _particular project_ resides in a test folder of your development, e.g. in 

    /home/me/dev/fancy-hitchy-extension/test/project/candidate-a

The first path name addresses folder containing your extension. The second one is addressing a folder containing some (fake) Hitchy project used to test your extension. Distinguishing this is essential to understanding how to use this module for starting a Hitchy instance for testing:

```javascript
const { start, stop, query } = require( "hitchy-server-dev-tools" );

start( {
	extensionFolder: "/home/me/dev/fancy-hitchy-extension",
	testProjectFolder: "/home/me/dev/fancy-hitchy-extension/test/project/candidate-a",
} )
	.then( server => {
		return query.put( "/exposed/route/of/hitchy?foo=bar", { 
			jsonData: "put in request body",
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

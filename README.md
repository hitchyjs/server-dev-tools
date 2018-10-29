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

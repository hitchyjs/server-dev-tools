/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const OS = require( "os" );
const Path = require( "path" );
const Crypto = require( "crypto" );

const FileEssentials = require( "file-essentials" );
const PromiseEssentials = require( "promise-essentials" );
const HitchyTestTools = require( "hitchy/tools/test" );

const temporaryBaseFolder = Path.resolve( OS.tmpdir(), "$hitchy-dev" );

/**
 * @typedef {object} ToolKitOptions
 * @property {string} testProjectFolder path name of folder containing some Hitchy project basically served by started hitchy instance
 * @property {string} pluginsFolder path name of folder containing project to be discovered by Hitchy as a plugin
 * @property {object} options custom options to pass into Hitchy
 * @property {object} args custom args to pass into Hitchy
 * @property {array} files list of files to temporarily create
 * @property {boolean} useTmpPath forces toolkit to copy selected project folder to temporary path (e.g. on using w/o adjusting files' content)
 */

/**
 * @typedef {HitchyTestContext} ExtendedHitchyTestContext
 * @property {string} temporaryFolder pathname of temporary project folder managed by toolkit
 * @property {object} options set of options eventually provided on starting Hitchy
 */

/**
 * Processes certain options specific to server-dev-tools in preparation for
 * starting Hitchy instance.
 *
 * @param {ToolKitOptions} toolkitOptions customizes behaviour of server dev tools running Hitchy
 * @returns {Promise<{temporaryFolder: string, customFolders: object}>} promises information resulting from preparing start of server
 */
function preStart( toolkitOptions = {} ) {
	const { testProjectFolder = null, pluginsFolder = null, files = null, options = {}, useTmpPath = false } = toolkitOptions;
	const result = {
		customFolders: {},
		temporaryFolder: undefined,
	};

	if ( pluginsFolder ) {
		const strPluginsFolder = String( pluginsFolder );

		result.customFolders.pluginsFolder = strPluginsFolder;
		result.customFolders.explicitPlugins = [strPluginsFolder];
	}

	return new Promise( ( resolve, reject ) => {
		if ( files || useTmpPath ) {
			if ( options.debug ) {
				console.log( "Copying files into temporary folder. This might take a while." );
			}

			FileEssentials.mkdir( temporaryBaseFolder )
				.then( () => {
					result.temporaryFolder = Path.resolve( temporaryBaseFolder, Crypto.randomBytes( 8 ).toString( "hex" ) );

					return FileEssentials.mkdir( result.temporaryFolder );
				} )
				.then( () => {
					const projectFolder = testProjectFolder || options.projectFolder;

					if ( !projectFolder ) {
						return undefined;
					}

					return FileEssentials.find( projectFolder, {
						filter: lP => lP !== ".git",
						converter: ( _, __, stat ) => ( stat.isFile() ? _ : null ),
					} )
						.then( sources => PromiseEssentials.each( sources, source => {
							return FileEssentials.read( Path.resolve( projectFolder, source ) )
								.then( content => {
									return FileEssentials.mkdir( result.temporaryFolder, Path.dirname( source ) )
										.then( () => FileEssentials.write( Path.resolve( result.temporaryFolder, source ), content ) )
										.then( () => undefined );
								} );
						} ) )
						.then( () => {
							result.customFolders.projectFolder = result.temporaryFolder;
						} );
				} )
				.then( () => {
					if ( !files ) {
						return undefined;
					}

					return PromiseEssentials.each( Object.keys( files ), key => {
						return FileEssentials.mkdir( Path.resolve( result.temporaryFolder, Path.dirname( key ) ) )
							.then( () => FileEssentials.write( Path.resolve( result.temporaryFolder, key ), files[key] ) )
							.then( () => {
								result.customFolders.projectFolder = result.temporaryFolder;
							} );
					} );
				} )
				.then( () => resolve( result ) )
				.catch( err => {
					console.error( err );
					reject( err );
				} );
		} else {
			if ( !options.projectFolder && !testProjectFolder ) {
				throw new TypeError( "missing required select of folder containing some Hitchy project" );
			}

			if ( testProjectFolder ) {
				result.customFolders.projectFolder = String( testProjectFolder );
			}

			resolve( result );
		}
	} );
}

/**
 * Cleans up after Hitchy has been stopped.
 *
 * @param {ExtendedHitchyTestContext} context context of running tests
 * @param {boolean} keepFiles set true to prevent code from removing temporary project folder
 * @returns {Promise|undefined} optional promise for having cleaned up
 */
function postStop( context, keepFiles ) {
	if ( context.temporaryFolder && !keepFiles ) {
		const { temporaryFolder } = context;

		return FileEssentials.rmdir( temporaryFolder )
			.then( () => FileEssentials.stat( Path.resolve( temporaryBaseFolder ) ) )
			.then( stats => {
				if ( stats && stats.isDirectory() ) {
					return FileEssentials.list( Path.resolve( temporaryBaseFolder ) )
						.then( list => ( list.length ? undefined : FileEssentials.rmdir( Path.resolve( temporaryBaseFolder ) ) ) )
						.then( () => undefined );
				}

				return undefined;
			} );
	}

	return undefined;
}

/**
 * Starts Hitchy server exposing project in provided folder and loading plugins
 * from explicitly listed folders.
 *
 * @param {ToolKitOptions} toolkitOptions customizes behaviour of invoked Hitchy server
 * @returns {Promise<HitchyTestContext>} promises started server instance of Hitchy
 */
exports.start = function( toolkitOptions = {} ) {
	return preStart( toolkitOptions )
		.then( ( { customFolders, temporaryFolder } ) => {
			const options = Object.assign( {}, toolkitOptions.options, customFolders );
			const args = Object.assign( {}, toolkitOptions.args );

			return HitchyTestTools.startServer( options, args )
				.then( context => {
					context.options = options;
					context.args = args;

					if ( temporaryFolder ) {
						context.temporaryFolder = temporaryFolder;
					}

					return context;
				} );
		} );
};

/**
 * Stops Hitchy server.
 *
 * @param {Promise<HitchyTestContext>|HitchyTestContext} context promise for Hitchy server started or that server itself
 * @param {boolean} keepFiles set true to prevent removal of temporary project folder
 * @returns {Promise} promises Hitchy server stopped
 */
exports.stop = function( context, keepFiles = false ) {
	return ( context instanceof Promise ? context : Promise.resolve( context ) )
		.then( _context => {
			return ( _context && _context.hitchy ? _context.hitchy.api.shutdown() : undefined )
				.then( () => postStop( _context, keepFiles ) );
		} );
};

/**
 * Generates function for use with a test runner's support to set up test suite
 * by starting Hitchy server prior to running any tests relying on it.
 *
 * @param {object} context context descriptor
 * @param {ToolKitOptions} toolkitOptions customizes managed Hitchy instance
 * @returns {function(): Promise<any>} function to be invoked by test runner's preparation code
 */
exports.before = function( context, toolkitOptions = {} ) {
	return function() {
		return preStart( toolkitOptions )
			.then( ( { customFolders, temporaryFolder } ) => {
				const options = Object.assign( {}, toolkitOptions.options, customFolders );
				const args = Object.assign( {}, toolkitOptions.args );

				return HitchyTestTools.before( context, options, args )()
					.then( () => {
						context.options = options;
						context.args = args;

						if ( temporaryFolder ) {
							context.temporaryFolder = temporaryFolder;
						}
					} );
			} );
	};
};

/**
 * Generates function for use with a test runner's support to tear down test
 * suite by stopping Hitchy server after running any tests relying on it.
 *
 * @param {object} context context descriptor
 * @param {boolean} keepFiles set true to prevent removal of temporary project folder
 * @returns {function(): Promise<any>} function to be invoked by test runner's preparation code
 */
exports.after = function( context, keepFiles = false ) {
	return function() {
		return HitchyTestTools.after( context )()
			.then( () => postStop( context, keepFiles ) );
	};
};

/**
 * Exposes base function for issuing HTTP request to some service.
 *
 * @type {function(method:string, url:string, body:(Buffer|string|object), headers:object):Promise<ServerResponse>}
 */
exports.request = HitchyTestTools.request;

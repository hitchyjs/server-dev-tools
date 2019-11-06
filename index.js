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

const HitchyNode = require( "hitchy" ).node;
const HitchyTestTools = require( "hitchy/tools/test" );

const FileEssentials = require( "file-essentials" );
const PromiseEssentials = require( "promise-essentials" );
const Os = require( "os" );
const Path = require( "path" );
const Crypto = require( "crypto" );

const hitchyDev = Path.resolve( Os.tmpdir(), "$hitchy-dev" );

exports.query = {};

[ "get", "post", "put", "patch", "delete", "head", "options", "trace", "request" ]
	.forEach( methodName => {
		exports.query[methodName] = HitchyTestTools[methodName];
	} );


/**
 * Starts Hitchy server exposing project in provided folder and loads
 * plugins from explicitly listed folders.
 *
 * @param {string} testProjectFolder path name of folder containing some Hitchy project basically served by started hitchy instance
 * @param {string} pluginsFolder path name of folder containing project to be Hitchy plugin of instance serving hitchy project
 * @param {object} options custom options to pass into Hitchy
 * @param {array} files list of files to temporarily create
 * @param {boolean} useTmpPath if pluginsFolder and testProjectFolder should be copied into a temporary Folder
 * @returns {Promise<Server>} promises started server instance of Hitchy
 */
exports.start = function( { testProjectFolder = null, pluginsFolder = null, files = null, options = {}, useTmpPath = false } = {} ) {
	const customFolders = {};
	return new Promise( ( resolve, reject ) => {
		if ( files || useTmpPath ) {
			let tmpPath;
			if ( options.debug ) console.log( "copying files into a temporary folder, this might take a while" );
			FileEssentials.mkdir( hitchyDev )
				.then( () => {
					tmpPath = Path.resolve( hitchyDev, Crypto.randomBytes( 8 ).toString( "hex" ) );
					return FileEssentials.mkdir( tmpPath );
				} )
				.then( () => {
					const Promises = [];
					const folders = { testProjectFolder, pluginsFolder };
					for ( const folderName of [ "testProjectFolder", "pluginsFolder" ] ) {
						const folder = folders[folderName];
						if ( folder ) {
							const tmpFolder = Path.resolve( tmpPath, folderName );
							Promises.push( FileEssentials.mkdir( tmpFolder )
								.then( () => FileEssentials.find( folder, {
									filter: lP => lP !== ".git", converter: ( _, __, stat ) => ( stat.isFile() ? _ : null )
								} )
									.then( list => PromiseEssentials
										.each( list, filename => {
											return FileEssentials.read( Path.resolve( folder, filename ) )
												.then( content => {
													return FileEssentials.mkdir( tmpFolder, Path.dirname( filename ) )
														.then( () => {
															FileEssentials.write( Path.resolve( tmpFolder, filename ), content );
														} );
												} );
										} )
										.then( () => {
											if ( folderName === "testProjectFolder" ) {
												customFolders.pluginsFolder = tmpFolder;
												customFolders.explicitPlugins = [tmpFolder];
											} else {
												customFolders.projectFolder = tmpFolder;
											}
										} )
									)
								) );
						}
					}
					return Promise.all( Promises );
				} )
				.then( () => ( files ? PromiseEssentials
					.each( Object.keys( files ) , key => FileEssentials.mkdir( Path.resolve( tmpPath, "testProjectFolder", Path.dirname( key ) ) )
						.then( () => FileEssentials.write( Path.resolve( tmpPath, "testProjectFolder", key ), files[key] ) )
						.then( () => {
							customFolders.projectFolder = Path.resolve( tmpPath, "testProjectFolder" );
							resolve( tmpPath );
						} )
					) : undefined ) )
				.catch( err => {
					console.error( err );
					reject( err );
				} );
			return;
		}
		if ( !options.projectFolder && !testProjectFolder ) {
			throw new TypeError( "missing required select of folder containing some Hitchy project" );
		}

		if ( pluginsFolder ) {
			const strPluginsFolder = String( pluginsFolder );

			customFolders.pluginsFolder = strPluginsFolder;
			customFolders.explicitPlugins = [strPluginsFolder];
		}

		if ( testProjectFolder ) {
			customFolders.projectFolder = String( testProjectFolder );
		}
		resolve();
	} ).then( tmpPath => {
		return HitchyTestTools.startServer( HitchyNode( Object.assign( {}, options, customFolders ) ) ).then(
			server => {
				if ( tmpPath ) {
					server.tmpPath = tmpPath;
				}
				return server;
			}
		);
	} );
};

/**
 * Stops Hitchy server.
 *
 * @param {Promise<Server>|Server} server promise for Hitchy server started or that server itself
 * @returns {Promise} promises Hitchy server stopped
 */
exports.stop = function( server ) {
	const _server = server instanceof Promise ? server : Promise.resolve( server );

	return _server.then( serverInstance => {
		return new Promise( resolve => {
			if ( serverInstance ) {
				serverInstance.once( "close", resolve );
				serverInstance.close();
			} else {
				resolve();
			}
		} )
			.then( () => {
				const { tmpPath } = server;
				if ( tmpPath ) {
					return FileEssentials.rmdir( tmpPath )
						.then( () => FileEssentials.list( Path.resolve( hitchyDev ) ) )
						.then( list => {
							return list.length ? undefined : FileEssentials.rmdir( Path.resolve( hitchyDev ) );
						} );
				}
				return undefined;
			} );
	} );
};

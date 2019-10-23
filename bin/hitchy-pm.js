#!/usr/bin/env node
/**
 * (c) 2019 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 cepharum GmbH
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

const Path = require( "path" );
const File = require( "fs" );
const Child = require( "child_process" );

// ----------------------------------------------------------------------------

const args = process.argv.slice( 2 );
const numArgs = args.length;
const deps = [];

const mode = "simple";
let quiet = false;
let exec = null;

( function() {

	for ( let i = 0; i < numArgs; i++ ) {
		const arg = String( args[i] ).trim();

		if ( exec ) {
			if ( /\s/.test( arg ) ) {
				exec.push( `'${arg.replace( /'/g, "\\'" )}'` );
			} else {
				exec.push( arg );
			}
			continue;
		}

		switch ( arg ) {
			case "--quiet" :
				quiet = true;
				break;

			case "--resolve" :
				console.error( "This version does not support any other mode but --simple, yet." );
				process.exit( 1 );
				return;

			case "--exec" :
				exec = [];
				break;

			default :
				if ( arg[0] === "-" ) {
					console.error( `unexpected option: ${arg}` );
					break;
				}

				if ( /\s/.test( arg ) ) {
					console.error( `got invalid dependency name: ${arg}` );
					break;
				}

				if ( /^hitchy-/.test( arg ) ) {
					deps.push( arg );
				} else {
					deps.push( `hitchy-plugin-${arg}` );
				}
		}
	}

	if ( exec && !exec.length ) {
		console.error( `missing command to execute eventually` );
		process.exit( 1 );
		return;
	}

	// ----------------------------------------------------------------------------

	const numDeps = deps.length;

	switch ( mode ) {
		case "simple" :
			if ( numDeps > 0 ) {
				processSimple( deps, 0, numDeps, [], installMissing );
			} else {
				installMissing( null, [] );
			}
			break;

		default :
			installMissing( new Error( "invalid mode for checking dependencies" ) );
	}

} )();


/**
 * Successively tests provided names of dependencies for matching existing
 * folder in local sub-folder `node_modules` each containing file hitchy.json.
 *
 * @param {string[]} names list of dependency names to be tested
 * @param {int} current index of next item in provided list to be processed
 * @param {int} stopAt index to stop at
 * @param {string[]} collector lists names considered missing related folder in local `node_modules`
 * @param {function(?Error)} done callback invoked on error or when done
 * @returns {void}
 */
function processSimple( names, current, stopAt, collector, done ) {
	const name = names[current];

	File.stat( Path.join( "node_modules", name, "hitchy.json" ), ( error, stat ) => {
		if ( error ) {
			if ( error.code === "ENOENT" ) {
				collector.push( name );
			} else {
				done( error );
				return;
			}
		} else if ( stat.isFile() ) {
			if ( !quiet ) {
				console.error( `${name} ... found` );
			}
		} else {
			done( new Error( `dependency ${name}: not a folder` ) );
			return;
		}

		if ( current + 1 < stopAt ) {
			processSimple( names, current + 1, stopAt, collector, done );
		} else {
			done( null, collector );
		}
	} );
}

/**
 * Installs collected dependencies considered missing or handles provided error.
 *
 * @param {Error} error encountered error
 * @param {string[]} collected list of dependencies considered missing
 * @returns {void}
 */
function installMissing( error, collected ) {
	if ( error ) {
		console.error( `checking dependencies failed: ${error.message}` );

		process.exit( 1 );
		return;
	}

	if ( collected.length < 1 ) {
		postProcess( 0 );
	} else {
		if ( !quiet ) {
			console.error( `installing missing dependencies:\n${collected.map( d => `* ${d}` ).join( "\n" )}` );
		}

		const npm = Child.exec( `npm install --no-save ${collected.join( " " )}`, {
			stdio: "pipe",
		} );

		npm.stdout.pipe( process.stdout );
		npm.stderr.pipe( process.stderr );

		npm.on( "exit", postProcess );
	}


	/**
	 * Handles event of having passed installation of missing dependencies.
	 *
	 * @param {int} errorCode status code on exit of npm installing missing dependencies
	 * @returns {void}
	 */
	function postProcess( errorCode ) {
		if ( errorCode ) {
			console.error( `running npm for installing missing dependencies ${collected.join( ", " )} exited on error (${errorCode})` );
		} else if ( exec ) {
			const cmd = exec.join( " " );

			if ( !quiet ) {
				console.error( `invoking follow-up command: ${cmd}` );
			}

			const followup = Child.exec( cmd );

			followup.stdout.pipe( process.stdout );
			followup.stderr.pipe( process.stderr );

			followup.on( "exit", code => {
				process.exit( code );
			} );

			return;
		}

		process.exit( errorCode );
	}
}


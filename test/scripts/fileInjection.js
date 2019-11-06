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

const HitchyDev = require( "../../index" );

require( "should" );
require( "should-http" );

const FileEssentials = require( "file-essentials" );
const os = require( "os" );
const Path = require( "path" );

describe( "fileInjection", () => {
	before( () => {
		return FileEssentials.stat( Path.resolve( os.tmpdir(), "$hitchy-dev" ) )
			.then( stat => ( stat == null ? null : FileEssentials.rmdir( Path.resolve( os.tmpdir(), "$hitchy-dev" ) ) ) );
	} );

	after( () => {
		return FileEssentials.stat( Path.resolve( os.tmpdir(), "$hitchy-dev" ) )
			.then( stat => ( stat == null ? null : FileEssentials.rmdir( Path.resolve( os.tmpdir(), "$hitchy-dev" ) ) ) );
	} );

	it( "creates temporary files with the content received from options.files", () => {
		let server;
		return HitchyDev.start( {
			files: {
				a: `// this is a test`,
			}
		} )
			.then( s => { server = s; } )
			.then( () => FileEssentials.read( Path.resolve( server.tmpPath, "testProjectFolder", "a" ) ) )
			.then( result => result.toString().should.eql( `// this is a test` ) )
			.then( () => HitchyDev.stop( server ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder", "a" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath ) ).should.be.resolvedWith( null ) );
	} );

	it( "can create a config file that hitchy will find", () => {
		let server;
		const file = `"use strict";
					module.exports = function() {
						return {
							auth: {
								filterPassword: "truthy",
							}
						};
					};`;
		return HitchyDev.start( {
			files: {
				"config/auth.js": file
			},
		} )
			.then( s => ( server = s ) )
			.then( () => FileEssentials.read( Path.resolve( server.tmpPath, "testProjectFolder", "config/auth.js" ) ) )
			.then( result => result.toString().should.be.eql( file ) )
			.then( () => server.$hitchy.hitchy.config.auth.filterPassword.should.be.eql( "truthy" ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder", "config/auth.js" ) ) )
			.then( result => result.isFile().should.be.true() )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder", "config" ) ) )
			.then( result => result.isDirectory().should.be.true() )
			.then( () => HitchyDev.stop( server ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder", "config/auth.js" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder", "config" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath, "testProjectFolder" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( server.tmpPath ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( os.tmpdir(), "$hitchy-dev" ) ).should.be.resolvedWith( null ) );

	} );

	describe( "can use an external ProjectFolder", () => {
		it( "with testPluginsFolder", () => {
			let server;
			return HitchyDev.start( {
				testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
				testPluginsFolder: Path.resolve( __dirname, "../../" ),
			} )
				.then( s => ( server = s ) )
				.then( () => {
					server.$hitchy.hitchy.config.test.success.should.be.true();
				} );
		} );
		it( "without testPluginsFolder", () => {
			let server;
			return HitchyDev.start( {
				testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
			} )
				.then( s => ( server = s ) )
				.then( () => {
					server.$hitchy.hitchy.config.test.success.should.be.true();
				} );
		} );

	} );

	it( "can us a combination of files and projectFolder", () => {
		return HitchyDev.start( {
			testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
			files: {
				"config/extra.js": `
"use strict";
module.exports = {
	extra: {
		success: true,
	}
};`,
			}
		} )
			.then( server => {
				server.$hitchy.hitchy.config.test.success.should.be.true();
				server.$hitchy.hitchy.config.extra.success.should.be.true();
			} );
	} );
} );

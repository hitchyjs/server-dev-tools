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

const { describe, before, after, afterEach, it } = require( "mocha" );
const FileEssentials = require( "file-essentials" );
require( "should" );

const ServerDevTools = require( "../../" );

describe( "Support for compiling temporary project folder", () => {
	const ctx = {};

	before( () => FileEssentials.rmdir( Path.resolve( OS.tmpdir(), "$hitchy-dev" ) ) );

	afterEach( ServerDevTools.after( ctx ) );

	after( () => FileEssentials.rmdir( Path.resolve( OS.tmpdir(), "$hitchy-dev" ) ) );

	it( "creates temporary files from content provided in `files` option", () => {
		return ServerDevTools.before( ctx, {
			files: {
				a: "// this is a test",
			}
		} )()
			.then( () => FileEssentials.read( Path.resolve( ctx.temporaryFolder, "a" ) ) )
			.then( result => result.toString().should.eql( "// this is a test" ) )
			.then( ServerDevTools.after( ctx ) )
			.then( () => FileEssentials.stat( Path.resolve( ctx.temporaryFolder, "a" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( ctx.temporaryFolder ) ).should.be.resolvedWith( null ) );
	} );

	it( "passes temporary project folder as such into Hitchy", () => {
		return ServerDevTools.before( ctx, {
			files: {
				a: "// this is a test",
			}
		} )()
			.then( () => {
				ctx.temporaryFolder.should.be.equal( ctx.options.projectFolder );
			} );
	} );

	it( "creates a configuration file Hitchy is discovering", () => {
		const file = `"use strict";

module.exports = function( options ) {
	return {
		auth: {
			receivedProjectFolder: options.projectFolder,
			filterPassword: "truthy",
		}
	};
};`;

		return ServerDevTools.before( ctx, {
			files: {
				"config/auth.js": file
			},
		} )()
			.then( () => FileEssentials.read( Path.resolve( ctx.temporaryFolder, "config/auth.js" ) ) )
			.then( content => {
				content.toString().should.be.eql( file );

				ctx.hitchy.api.config.auth.filterPassword.should.be.equal( "truthy" );

				return FileEssentials.stat( Path.resolve( ctx.temporaryFolder, "config/auth.js" ) );
			} )
			.then( result => result.isFile().should.be.true() )
			.then( () => FileEssentials.stat( Path.resolve( ctx.temporaryFolder, "config" ) ) )
			.then( result => result.isDirectory().should.be.true() )
			.then( ServerDevTools.after( ctx ) )
			.then( () => FileEssentials.stat( Path.resolve( ctx.temporaryFolder, "config/auth.js" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( ctx.temporaryFolder, "config" ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( ctx.temporaryFolder ) ).should.be.resolvedWith( null ) )
			.then( () => FileEssentials.stat( Path.resolve( OS.tmpdir(), "$hitchy-dev" ) ).should.be.resolvedWith( null ) );
	} );

	it( "can use an external projectFolder with testPluginsFolder", () => {
		return ServerDevTools.before( ctx, {
			testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
			testPluginsFolder: Path.resolve( __dirname, "../../" ),
		} )()
			.then( () => {
				ctx.hitchy.api.config.test.success.should.be.true();
			} );
	} );

	it( "can use an external projectFolder without testPluginsFolder", () => {
		return ServerDevTools.before( ctx, {
			testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
		} )()
			.then( () => {
				ctx.hitchy.api.config.test.success.should.be.true();
			} );
	} );

	it( "can us a combination of files and projectFolder", () => {
		return ServerDevTools.before( ctx, {
			testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
			files: {
				"config/extra.js": `"use strict";

module.exports = {
	extra: {
		success: true,
	}
};`,
			}
		} )()
			.then( () => {
				ctx.hitchy.api.config.test.success.should.be.true();
				ctx.hitchy.api.config.extra.success.should.be.true();
			} );
	} );

	it( "can us a combination of files, pluginFolder and projectFolder", () => {
		return ServerDevTools.before( ctx, {
			testProjectFolder: Path.resolve( __dirname, "../project/basic" ),
			testPluginsFolder: Path.resolve( __dirname, "../../" ),
			files: {
				"config/extra.js": `"use strict";

module.exports = {
	extra: {
		success: true,
	}
};`,
			}
		} )()
			.then( () => {
				ctx.hitchy.api.config.test.success.should.be.true();
				ctx.hitchy.api.config.extra.success.should.be.true();
			} );
	} );
} );

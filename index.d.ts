declare module "hitchy-server-dev-tools" {
    import { Server, ServerResponse } from "http";
    import { HitchyInstance, HitchyOptions } from "hitchy";

    interface ContextInformation {
        /** Exposes web server started for receiving requests to be dispatched into Hitchy instance. */
        server: Server;
        /** Exposes instance of Hitchy handling requests received via web server. */
        hitchy: HitchyInstance;
        /** Exposes pathname of temporary folder created automatically for compiling temporary project to be processed by Hitchy. */
        temporaryFolder?: string;
        /** Exposes options eventually passed to code for starting Hitchy instance. */
        options: object;
        /** Exposes CLI argumens eventually passed to code for starting Hitchy instance. */
        args: object;
    }

    type ResultingContext = ContextInformation | Promise<ContextInformation>;

    interface ContextDescriptor extends ContextInformation {
        /** Lists messages logged to console. */
        logged?: string[];

        /** Send GET request to running Hitchy application. */
        get: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send POST request to running Hitchy application. */
        post: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send PUT request to running Hitchy application. */
        put: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send PATCH request to running Hitchy application. */
        patch: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send DELETE request to running Hitchy application. */
        delete: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send HEAD request to running Hitchy application. */
        head: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send OPTIONS request to running Hitchy application. */
        options: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
        /** Send TRACE request to running Hitchy application. */
        trace: ( url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;

        /** Send HTTP request to running Hitchy application. */
        request: ( method: string, url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ) => Promise<ExtendedServerResponse>;
    }

    /**
     * Describes options supported by server-dev-tools on managing Hitchy
     * temporarily run for unit-testing.
     */
    interface ToolkitOptions {
        /** Selects existing folder on disk containing project to be presented by wrapped Hitchy. [default: none] */
        testProjectFolder?: string;
        /** Selects existing folder on disk containing code of plugin to be tested via some temporary application. [default: none] */
        pluginsFolder?: string;
        /** Provides options to be forwarded to managed instance of Hitchy. [default: none] */
        options?: HitchyOptions;
        /** Provides parsed (fake) CLI arguments to be forwarded to managed instance of Hitchy. See minimist for information on structure. [default: none] */
        args?: HitchyOptions;
        /** Maps pathnames relative to project's root of files to be temporarily created into desired content of either file. [default: none] */
        files?: { [key: string]: string };
        /** Controls whether enforcing to copy selected project folder into temporary one. [default: false] */
        useTmpPath?: boolean;
    }

    type GeneratedFunction = () => Promise<void>;

    /**
     * Generates function for use with test runners' support for setting up
     * runtime environment for actual test suites.
     *
     * @param context handle of resulting runtime environment, will be populated on invoking returned function
     * @param toolkitOptions customizations for runtime environment
     * @param timeout timeout in milliseconds for running returned function
     * @returns function for use with methods like mocha's `before()` or `beforeEach()`
     */
    function before( context: ContextDescriptor, toolkitOptions: ToolkitOptions, timeout?: number ): GeneratedFunction;

    /**
     * Generates function for use with test runners' support for tearing down
     * runtime environment after running actual test suites.
     *
     * @param context handle populated on invoking function returned from `before()`
     * @param keepFiles set true to prevent removal of temporarily created project folder
     * @returns function for use with methods like mocha's `before()` or `beforeEach()`
     */
    function after( context: ContextDescriptor, keepFiles?: boolean ): GeneratedFunction;

    /**
     * Starts instance of Hitchy for providing application customized by provided
     * options.
     *
     * @param toolkitOptions options customizing way of setting up project folder to be processed by Hitchy
     * @returns promise for information to access started server and Hitchy instance
     */
    function start( toolkitOptions: ToolkitOptions ): Promise<ContextInformation>;

    /**
     * Stops previously started instance of Hitchy.
     *
     * @param context context information returned from calling `start()` before
     * @param keepFiles set true to prevent removal of temporarily created project folder
     * @returns promise Hitchy instance shut down
     */
    function stop( context: ContextInformation, keepFiles?: boolean ): Promise<void>;

    interface ExtendedServerResponse extends ServerResponse {
        /** Exposes raw response body. */
        body: Buffer;
        /** Exposes parsed data provided in JSON-formatted response body. */
        data?: any;
        /** Exposes string found in text-type response body. */
        text?: string;
    }

    /**
     * Sends HTTP request to server described by context given as `this` and
     * promises server's response.
     *
     * @param method HTTP method
     * @param url request URL
     * @param body request body
     * @param headers custom request headers
     * @returns promise for server's response including response body probably pre-parsed into text (on text response) or object (on JSON response)
     */
    function request( this: ContextInformation, method: string, url: string, body?: Buffer|string|object, headers?: { [ key: string ]: string } ): Promise<ExtendedServerResponse>;
}

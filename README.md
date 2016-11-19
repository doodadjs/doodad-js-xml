XML Parser

[![NPM Version][npm-image]][npm-url]
 
## Installation

```bash
$ npm install doodad-js-xml
```

## Features

  -  Parses XML from a stream.
  -  By default, it uses the 'sax' package, but can support any other parser accepting chunks of data.

## Quick Start

```js
    "use strict";

    const modules = {};
	require('doodad-js-io').add(modules);
	require('doodad-js-xml').add(modules);

    require('doodad-js').createRoot(modules).then(root => {
			const xml = root.Doodad.Tools.Xml;
			// NOTE: Random songs
			return xml.parse("<songs><song><title>Another Me In Lack'ech</title><artist>Epica</artist></song><song><title>Silent Lucidity</title><artist>Queensryche</artist></song><song><title>One</title><artist>Metallica</artist></song></songs>")
		}).then(doc => {
			console.log(doc);
		}).catch(err => {
            console.error(err);
        });
```

## Other available packages

  - **doodad-js**: Object-oriented programming framework (release)
  - **doodad-js-cluster**: Cluster manager (alpha)
  - **doodad-js-dates**: Dates formatting (release)
  - **doodad-js-http**: Http server (alpha)
  - **doodad-js-http_jsonrpc**: JSON-RPC over http server (alpha)
  - **doodad-js-io**: I/O module (alpha)
  - **doodad-js-ipc**: IPC/RPC server (alpha)
  - **doodad-js-json**: JSON parser (alpha)
  - **doodad-js-loader**: Scripts loader (beta)
  - **doodad-js-locale**: Locales (release)
  - **doodad-js-make**: Make tools for doodad (alpha)
  - **doodad-js-mime**: Mime types (beta)
  - **doodad-js-minifiers**: Javascript minifier used by doodad (alpha)
  - **doodad-js-safeeval**: SafeEval (beta)
  - **doodad-js-server**: Servers base module (alpha)
  - **doodad-js-templates**: HTML page templates (alpha)
  - **doodad-js-terminal**: Terminal (alpha)
  - **doodad-js-test**: Test application
  - **doodad-js-unicode**: Unicode Tools (alpha)
  - **doodad-js-widgets**: Widgets base module (alpha)
  - **doodad-js-xml**: XML Parser (release)
  
## License

  [Apache-2.0][license-url]

[npm-image]: https://img.shields.io/npm/v/doodad-js-xml.svg
[npm-url]: https://npmjs.org/package/doodad-js-xml
[license-url]: http://opensource.org/licenses/Apache-2.0
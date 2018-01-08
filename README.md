XML Parser

[![NPM Version][npm-image]][npm-url]
 
## Installation

```bash
$ npm install @doodad-js/xml
```

## Features

  -  Parses XML from a stream.
  -  By default, it uses the 'sax' package, but can support any other parser accepting chunks of data.

## Quick Start

```js
    "use strict";

	require('@doodad-js/core').createRoot()
		.then(root => {
			return root.Doodad.Modules.load([
				{
					module: '@doodad-js/xml'
				}
			]);
		})
		.then(root => {
			const xml = root.Doodad.Tools.Xml;
			// NOTE: Random songs
			return xml.parse("<songs><song><title>Another Me In Lack'ech</title><artist>Epica</artist></song><song><title>Silent Lucidity</title><artist>Queensryche</artist></song><song><title>One</title><artist>Metallica</artist></song></songs>");
		}).then(doc => {
			const getItemValue = function(items, name) {
				return items.find(name)[0].getChildren().getAt(0).getValue();
			};
			for (let song of doc.getRoot().getChildren()) {
				const items = song.getChildren();
				console.log(getItemValue(items, 'title') + " from " + getItemValue(items, 'artist'));
			};
		}).catch(err => {
			console.error(err);
		});
```

## Other available packages

  - **@doodad-js/core**: Object-oriented programming framework (release)
  - **@doodad-js/cluster**: Cluster manager (alpha)
  - **@doodad-js/dates**: Dates formatting (beta)
  - **@doodad-js/http**: Http server (alpha)
  - **@doodad-js/http_jsonrpc**: JSON-RPC over http server (alpha)
  - **@doodad-js/io**: I/O module (alpha)
  - **@doodad-js/ipc**: IPC/RPC server (alpha)
  - **@doodad-js/json**: JSON parser (alpha)
  - **@doodad-js/loader**: Scripts loader (beta)
  - **@doodad-js/locale**: Locales (beta)
  - **@doodad-js/make**: Make tools for doodad (alpha)
  - **@doodad-js/mime**: Mime types (beta)
  - **@doodad-js/minifiers**: Javascript minifier used by doodad (alpha)
  - **@doodad-js/safeeval**: SafeEval (beta)
  - **@doodad-js/server**: Servers base module (alpha)
  - **@doodad-js/templates**: HTML page templates (alpha)
  - **@doodad-js/terminal**: Terminal (alpha)
  - **@doodad-js/test**: Test application
  - **@doodad-js/unicode**: Unicode Tools (beta)
  - **@doodad-js/widgets**: Widgets base module (alpha)
  - **@doodad-js/xml**: XML Parser (beta)
  
## License

  [Apache-2.0][license-url]

  This package also includes "libxml2", which is licensed under MIT.

[npm-image]: https://img.shields.io/npm/v/@doodad-js/xml.svg
[npm-url]: https://npmjs.org/package/@doodad-js/xml
[license-url]: http://opensource.org/licenses/Apache-2.0
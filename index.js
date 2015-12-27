// dOOdad - Object-oriented programming framework with some extras
// File: index.js - XML module startup file
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015 Claude Petit
//
//	Licensed under the Apache License, Version 2.0 (the "License");
//	you may not use this file except in compliance with the License.
//	You may obtain a copy of the License at
//
//		http://www.apache.org/licenses/LICENSE-2.0
//
//	Unless required by applicable law or agreed to in writing, software
//	distributed under the License is distributed on an "AS IS" BASIS,
//	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//	See the License for the specific language governing permissions and
//	limitations under the License.

(function() {
	var global = this;

	var exports = {};
	if (global.process) {
		module.exports = exports;
	};
	
	var MODULE_NAME = 'doodad-js-xml';
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES[MODULE_NAME] = {
			type: null,
			version: '0b',
			namespaces: null,
			dependencies: ['Doodad.Modules'],
			exports: exports,
			
			create: function create(root, /*optional*/_options) {
				"use strict";
				
				var doodad = root.Doodad,
					modules = doodad.Modules;
				
				var fromSource = root.startupOptions.settings.fromSource,
					promise;

				promise = modules.load(MODULE_NAME, (fromSource ? (global.process ? 'src/common/Tools_Xml.js' : 'Tools_Xml.js') : 'Tools_Xml.min.js'), _options);
				
				if (!_options || !_options.noSAX) {
					promise = promise.then(function() {
							return modules.load(MODULE_NAME, (fromSource ? (global.process ? 'src/common/Tools_Xml_Parsers_Sax.js' : 'Tools_Xml_Parsers_Sax.js') : 'Tools_Xml_Parsers_Sax.min.js'), _options);
						})
						.then(function() {
							return modules.load(MODULE_NAME, (fromSource ? (global.process ? 'src/server/Tools_Xml_Parsers_Sax_Loader.js' : 'Tools_Xml_Parsers_Sax_Loader.js') : 'Tools_Xml_Parsers_Sax_Loader.min.js'), _options);
						});
				};
				
				return promise;
			},
		};
		return DD_MODULES;
	};
	
	if (!global.process) {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
})();
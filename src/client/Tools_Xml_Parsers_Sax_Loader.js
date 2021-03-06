//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
	// doodad-js - Object-oriented programming framework
	// File: Tools_Xml_Parsers_Sax_Loader.js - Loader for SAX parser (client-side)
	// Project home: https://github.com/doodadjs/
	// Author: Claude Petit, Quebec city
	// Contact: doodadjs [at] gmail.com
	// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
	// License: Apache V2
	//
	//	Copyright 2015-2018 Claude Petit
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
//! END_REPLACE()

//! IF_SET("mjs")
//! ELSE()
	"use strict";
//! END_IF()

exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.Tools.Xml.Parsers.Sax.Loader'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.Tools.Xml',
		],

		create: function create(root, /*optional*/_options) {
			//===================================
			// Get namespaces
			//===================================

			const doodad = root.Doodad,
				//types = doodad.Types,
				tools = doodad.Tools,
				xml = tools.Xml,
				xmlParsers = xml.Parsers,
				sax = xmlParsers.Sax,
				saxLoader = sax.Loader;

			//===================================
			// Internal
			//===================================

			// <FUTURE> Thread context
			const __Internal__ = {
				sax: null,
			};

			//===================================
			// SAX Parser
			//===================================

			// NOTE: SAX is optional
			saxLoader.ADD('get', root.DD_DOC(
				//! REPLACE_IF(IS_UNSET('debug'), "null")
					{
						author: "Claude Petit",
						revision: 1,
						params: null,
						returns: 'object',
						description: "Returns parser from the SAX-JS library when available. Otherwise, returns 'undefined'.",
					}
				//! END_REPLACE()
				, function get() {
					if (__Internal__.sax) {
						return __Internal__.sax;
					};
					__Internal__.sax = global.sax;
					delete global.sax;
					return __Internal__.sax;
				}));


			//===================================
			// Init
			//===================================
			//return function init(/*optional*/options) {
			//};
		},
	};
	return modules;
};

//! END_MODULE()

//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: Tools_Xml_Parsers_Sax_Loader.js - Loader for SAX parser (client-side)
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2016 Claude Petit
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

module.exports = {
	add: function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.Tools.Xml.Parsers.Sax.Loader'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			dependencies: [
				'Doodad.Tools.Xml',
			],
			
			create: function create(root, /*optional*/_options) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================
					
				var doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					xml = tools.Xml,
					xmlParsers = xml.Parsers,
					sax = xmlParsers.Sax,
					saxLoader = sax.Loader;
					
				//===================================
				// Internal
				//===================================
					
				// <FUTURE> Thread context
				var __Internal__ = {
					xmlEntities: null,
				};
					
				//===================================
				// SAX Parser
				//===================================

				// NOTE: SAX is optional
				saxLoader.getSAX = root.DD_DOC(
					//! REPLACE_IF(IS_UNSET('debug'), "null")
					{
							author: "Claude Petit",
							revision: 0,
							params: null,
							returns: 'object',
							description: "Returns parser from the SAX-JS library when available. Otherwise, returns 'undefined'.",
					}
					//! END_REPLACE()
					, function getSAX() {
						return global.sax;
					});
				
				
				saxLoader.applyPatch = root.DD_DOC(
					//! REPLACE_IF(IS_UNSET('debug'), "null")
					{
							author: "Claude Petit",
							revision: 0,
							params: null,
							returns: 'undefined',
							description: "Applies a patch for client-side SAX-JS.",
					}
					//! END_REPLACE()
					, function applyPatch() {
						// <FIX> sax-js v1.1.4: "Stream.prototype.on" is undefined (client-side)
						var sax = saxLoader.getSAX();
						if (sax) {
							var SAXStream = sax.SAXStream,
								StreamProto = types.getPrototypeOf(SAXStream.prototype);
							if (StreamProto && !StreamProto.on) {
								StreamProto.on = function(ev, handler) {
									// ...
								};
							};
						};
					});
				
				
				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					// NOTE: You will need to call it manually if SAX-JS is not loaded at this time
					saxLoader.applyPatch();
				};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()
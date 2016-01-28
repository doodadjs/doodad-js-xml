//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework
// File: Tools_Xml_Parsers_Sax.js - SAX XML parser
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
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

(function() {
	var global = this;
	
	var exports = {};
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.Tools.Xml.Parsers.Sax'] = {
			type: null,
			version: '1r',
			namespaces: null,
			dependencies: [
				'Doodad.Types', 
				'Doodad.Tools', 
				{
					name: 'Doodad.IO',
					version: '0.2',
				}, 
				'Doodad.Tools.Xml', 
				'Doodad.Tools.Xml.Parsers.Sax.Loader',
			],
			
			create: function create(root, /*optional*/_options) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================
					
				var doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					namespaces = doodad.Namespaces,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					xml = tools.Xml,
					xmlParsers = xml.Parsers,
					sax = xmlParsers.Sax,
					saxLoader = sax.Loader;
					
				//===================================
				// Internal
				//===================================
				
				//var __Internal__ = {};
				
				//===================================
				// SAX Parser
				//===================================

				sax.parse = function(stream, /*optional*/options) {
					root.DD_ASSERT && root.DD_ASSERT(types._implements(stream, ioMixIns.TextInput) || types.isString(stream), "Invalid stream.");
					
					var sax = saxLoader.getSAX(),
						nodoc = types.get(options, 'nodoc', false),
						callback = types.get(options, 'callback', false),
						discardEntities = types.get(options, 'discardEntities', false);

					var Promise = tools.getPromise();
					return new Promise(function(resolve, reject) {
						var doc = (nodoc ? null : new xml.Document()),
							currentNode = doc,
							parser = sax.parser(true, types.extend({}, options, {xmlns: true, position: true}));
						
						var entities = types.get(options, 'entities', null);
						if (entities) {
							parser.ENTITIES = entities;
						} else {
							// NOTE: We reduce default entities only once when they are loaded (see 'init' below).
							parser.ENTITIES = xml.getEntities();
						};
						
						var aborted = false,
							attributes = [], // <PRB> 'onattribute' is called before 'onopentag' !
							ns = {};
						
						if (!nodoc && !discardEntities) {
							tools.forEach(parser.ENTITIES, function(value, name) {
								var node = new xml.Node(doc, xml.NodeTypes.Entity, name, null, null, value);
								if (nodoc) {
									callback(node);
								};
							});
						};
						
						parser.onerror = function(err) {
							if (!aborted) {
								aborted = true;
								reject(err);
								try {
									if (stream) {
										stream.stopListening();
										stream.destroy();
										stream = null;
									};
									parser.close();
								} catch(ex) {
								};
							};
						};
						
						parser.ontext = function(text) {
							if (!aborted) {
								try {
									var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.Text, "", null, null, text); 
									node.fileLine = parser.line + 1;
									node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.onscript = function(script) {
							if (!aborted) {
								try {
									var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.CDATASection, "", null, null, script); 
									node.fileLine = parser.line + 1;
									node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.onopentag = function(node) {
							if (!aborted) {
								try {
									var name = node.name,
										prefix = name.split(':', 2),
										uri = null;
									if (prefix.length > 1) {
										name = prefix[1];
										prefix = prefix[0];
										uri = types.get(ns, prefix, null);
										if (uri && uri.length) {
											uri = uri[uri.length - 1];
										};
									} else {
										prefix = null;
									};
									
									var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.Element, name, prefix, uri, ""); 
									node.fileLine = parser.line + 1;
									node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(currentNode);
									} else {
										currentNode = node;
									};
									// <PRB> 'onattribute' is called before 'onopentag' !
									for (var i = 0; i < attributes.length; i++) {
										var attr = attributes[i],
											line = attr[1],
											column = attr[2];
										attr = attr[0];
										var name = attr.name,
											prefix = name.split(':', 2),
											uri = null;
										if (prefix.length > 1) {
											name = prefix[1];
											prefix = prefix[0];
											uri = types.get(ns, prefix, null);
											if (uri && uri.length) {
												uri = uri[uri.length - 1];
											};
										} else {
											prefix = null;
										};
										var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.Attr, name, prefix, uri, attr.value);
										node.fileLine = line + 1;
										node.fileColumn = column + 1;
										if (nodoc) {
											callback(node);
										};
									};
									attributes.length = 0;
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.onclosetag = function(tagName) {
							if (!aborted) {
								if (!nodoc) {
									currentNode = currentNode.parentNode;
								};
							};
						};
						
						parser.onattribute = function(attr) {
							if (!aborted) {
								// <PRB> 'onattribute' is called before 'onopentag' !
								attributes.push([attr, parser.line, parser.column]);
							};
						};
						
						parser.ondoctype = function(doctype) {
							if (!aborted) {
								try {
									var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.DocumentType, "", null, null, doctype); 
									node.fileLine = parser.line + 1;
									node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.onprocessinginstruction = function(instr) {
							if (!aborted) {
								try {
									var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.ProcessingInstruction, instr.name, null, null, instr.body); 
									node.fileLine = parser.line + 1;
									node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.oncomment = function(comment) {
							if (!aborted) {
								try {
									var node = new xml.Node((nodoc ? null : currentNode), xml.NodeTypes.Comment, "", null, null, comment); 
									node.fileLine = parser.line + 1;
									node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.onopencdata = function() {
							if (!aborted) {
								try {
									if (!nodoc) {
										currentNode = new xml.Node(currentNode, xml.NodeTypes.CDATASection, "", null, null, ""); 
										currentNode.fileLine = parser.line + 1;
										currentNode.fileColumn = parser.column + 1;
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};

						parser.oncdata = function(cdata) {
							if (!aborted) {
								try {
									if (nodoc) {
										var node = new xml.Node(currentNode, xml.NodeTypes.CDATASection, "", null, null, cdata);
										node.fileLine = parser.line + 1;
										node.fileColumn = parser.column + 1;
										callback(node);
									} else {
										currentNode.nodeValue += cdata;
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};
						
						parser.onclosecdata = function() {
							if (!aborted) {
								if (!nodoc) {
									currentNode = currentNode.parentNode;
								};
							};
						};
						
						parser.onend = function() {
							if (!aborted) {
								try {
									if (nodoc) {
										callback(null);
									};
									resolve(doc);
									if (stream) {
										stream.stopListening();
										stream.destroy();
										stream = null;
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};

						parser.onopennamespace = function(namespace) {
							if (!aborted) {
								try {
									if (types.hasKey(ns, namespace.prefix)) {
										ns[namespace.prefix].push(namespace.uri);
									} else {
										ns[namespace.prefix] = [namespace.uri];
									};
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};

						parser.onclosenamespace = function(namespace) {
							if (!aborted) {
								try {
									var result = ns[namespace.prefix].pop();
									root.DD_ASSERT && root.DD_ASSERT(result === namespace.uri);
								} catch(ex) {
									parser.onerror(ex);
								};
							};
						};

						if (types.isString(stream)) {
							// For client-side which do not support streams
							var str = stream;
							stream = null; // for "onerror" and "onend"
							parser.write(str).close();
						} else {
							stream.onReady.attach(this, function(ev) {
								try {
									var value = ev.data.valueOf();
									if (value === io.EOF) {
										parser.close();
									} else {
										parser.write(value);
									};
									ev.preventDefault();
								} catch(ex) {
									aborted = true;
									reject(ex);
								};
							});
							stream.listen();
						};
					});
				};
				
				sax.isAvailable = function isAvailable() {
					return !!saxLoader.getSAX();
				};
				
				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					xml.registerParser(sax);
				};
			},
		};
		
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));
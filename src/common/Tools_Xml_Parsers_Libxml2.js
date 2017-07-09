//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: Tools_Xml_Parsers_Libxml2.js - libxml2 XML parser
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015-2017 Claude Petit
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
		DD_MODULES['Doodad.Tools.Xml.Parsers.Libxml2'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			dependencies: [
				'Doodad.Tools.Xml', 
				'Doodad.Tools.Xml.Parsers.Libxml2.Loader',
			],
			
			create: function create(root, /*optional*/_options) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================
					
				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					namespaces = doodad.Namespaces,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					files = tools.Files,
					xml = tools.Xml,
					xmlParsers = xml.Parsers,
					libxml2 = xmlParsers.Libxml2,
					libxml2Loader = libxml2.Loader;
					
				//===================================
				// Internal
				//===================================
				
				const NULL = 0;

				const __Internal__ = {
					createStrPtr: null,
					baseDirectories: null,
				};
				
				//===================================
				// Libxml2 Parser
				//===================================

				__Internal__.registerBaseDirectory = function registerBaseDirectory(schemaParserCtxt, directory) {
					if (!__Internal__.baseDirectories) {
						__Internal__.baseDirectories = types.nullObject();
					};
					if (types.has(__Internal__.baseDirectories, schemaParserCtxt)) {
						throw new types.Error("Base directory already registered on schema parser '~0~'.", [schemaParserCtxt]);
					};
					__Internal__.baseDirectories[schemaParserCtxt] = directory;
				};

				__Internal__.unregisterBaseDirectory = function unregisterBaseDirectory(schemaParserCtxt) {
					if (!__Internal__.baseDirectories || !types.has(__Internal__.baseDirectories, schemaParserCtxt)) {
						throw new types.Error("Base directory not registered on schema parser '~0~'.", [schemaParserCtxt]);
					};
					delete __Internal__.baseDirectories[schemaParserCtxt];
				};

				__Internal__.getBaseDirectory = function getBaseDirectory(schemaParserCtxt) {
					if (__Internal__.baseDirectories) {
						return types.get(__Internal__.baseDirectories, schemaParserCtxt);
					};
				};

				__Internal__.initLibxml2 = function initLibxml2() {
					const clibxml2 = libxml2Loader.get();

					clibxml2._xmlInitParser();

					const matchFunc = clibxml2.Runtime.addFunction(function matchFunc(filenameStrPtr) {
						// Force selection of our handlers.
						return 1;
					});

					const openFunc = clibxml2.Runtime.addFunction(function openFunc(filenameStrPtr) {
						// Disable file system access
						return NULL;
					});

					const readFunc = clibxml2.Runtime.addFunction(function readFunc(inputContextPtr, bufferPtr, bufferLen) {
						// Disable file system access
						return 0;
					});

					const writeFunc = clibxml2.Runtime.addFunction(function writeFunc(inputContextPtr, bufferPtr, bufferLen) {
						// Disable file system access
						return bufferLen;
					});

					const closeFunc = clibxml2.Runtime.addFunction(function closeFunc(inputContextPtr) {
						// Disable file system access
						return 0;
					});

					//const readExternalFunc = clibxml2.Runtime.addFunction(function readExternalFunc(readContextPtr, bufferPtr, bufferLen) {
					//	debugger;
					//});

					//const closeExternalFunc = clibxml2.Runtime.addFunction(function closeExternalFunc(readContextPtr) {
					//	clibxml2._free(readContextPtr);
					//	readContextPtr = NULL;
					//});

					//const externalLoader = clibxml2.Runtime.addFunction(function externalLoader(urlStrPtr, idStrPtr, parserCtxtPtr) {
					//	const path = xsd.set({file: null}).combine(clibxml2.Pointer_stringify(urlStrPtr));
					//	const readContextPtr = clibxml2._malloc(....);
					//	const inputPtr = clibxml2._xmlCreateMyParserInput(parserCtxtPtr, readContextPtr, readExternalFunc, closeExternalFunc);
					//	return inputPtr;
					//});

					const externalLoader = clibxml2.Runtime.addFunction(function externalLoader(urlStrPtr, idStrPtr, parserCtxtPtr) {
						// TODO: Read and store base directory from/to "userDataPtr" when "xmlSchemaNewParserCtxt" will accept a "userData" argument.

						const url = files.parseApiLocation(clibxml2.Pointer_stringify(urlStrPtr));

						let path = null;

						const userDataPtr = clibxml2._xmlGetUserDataFromParserCtxt(parserCtxtPtr);
						if (!userDataPtr) {
							throw new types.Error("The 'libxml2' C library needs some modifications before its compilation.");
						};
						const dir = __Internal__.getBaseDirectory(userDataPtr);
						if (dir) {
							path = dir.combine(url, {includePathInRoot: false});
						} else {
							__Internal__.registerBaseDirectory(userDataPtr, url.set({file: null}));
							path = url;
						};

//console.log(path.toApiString());
						let content = files.readFileSync(path, {encoding: 'utf-8'});
						let contentPtr = NULL;
						try {
							let contentLen = 0;
							if (types.isString(content)) {
								contentLen = clibxml2.lengthBytesUTF8(content);
								contentPtr = __Internal__.createStrPtr(content, contentLen);
							} else {
								contentLen = content.length;
								contentPtr = clibxml2.allocate(content, 'i8', clibxml2.ALLOC_NORMAL);
							};
							content = null; // free memory
							if (!contentPtr) {
								throw new types.Error("Failed to allocate buffer.");
							};
							const inputPtr = clibxml2._xmlCreateMyParserInput(parserCtxtPtr, contentPtr, contentLen);
							return inputPtr;
						} catch (ex) {
							throw ex;
						} finally {
							if (contentPtr) {
								clibxml2._free(contentPtr);
								contentPtr = NULL;
							};
						};
					});

					// Disable file system access
					clibxml2._xmlCleanupInputCallbacks();
					clibxml2._xmlCleanupOutputCallbacks();
					clibxml2._xmlRegisterInputCallbacks(matchFunc, openFunc, readFunc, closeFunc);
					clibxml2._xmlRegisterOutputCallbacks(matchFunc, openFunc, writeFunc, closeFunc);

					// Set our external loader.
					clibxml2._xmlSetExternalEntityLoader(externalLoader);

					__Internal__.createStrPtr = function _createStrPtr(str, /*optional*/len) {
						if (types.isNothing(len)) {
							len = clibxml2.lengthBytesUTF8(str);
						};
						const ptr = clibxml2._malloc(len + 1);
						if (ptr) {
							clibxml2.stringToUTF8(str, ptr, len + 1);
						};
						return ptr;
					};
				};


				__Internal__.trapCAborted = function trapCAborted(err) {
					if (err) {
						// <PRB> On 'abort', Emscripten throws a string instead of an object !
						if (types.isString(err)) {
							// We must abort because now libxml2 is unstable.
							console.error(err);
							tools.abortScript(1);
						} else {
							throw err;
						};
					};
				};


				libxml2.ADD('parse', function(stream, /*optional*/options) {
					const Promise = types.getPromise();
					return Promise.try(function() {
						let clibxml2 = null,
							allocatedFunctions = null,
							allocatedEntities = null,
							sax = NULL,
							saxOrg = NULL,
							saxPtr = NULL,
							userPtr = NULL,
							userPtrOrg = NULL,
							userPtrPtr = NULL,
							urlPtr = NULL,
							schemaParserCtxt = NULL,
							schema = NULL,
							validCtxt = NULL,
							saxPlug = NULL,
							pushParserCtxt = NULL;

						let xsd = types.get(options, 'xsd', null);

						let promise = null;

						if (xsd) {
							xsd = files.parseLocation(xsd);
							promise = files.readFileAsync(xsd);
						} else {
							promise = Promise.resolve(null);
						};

						promise = promise.thenCreate(function libxml2ParserPromise(xsdContent, resolve, reject) {
							// TODO: MemoryStream to replace strings
							root.DD_ASSERT && root.DD_ASSERT(types._implements(stream, ioMixIns.TextInput) || types.isString(stream), "Invalid stream.");
					
							clibxml2 = libxml2Loader.get();

							const nodoc = types.get(options, 'nodoc', false),
								discardEntities = types.get(options, 'discardEntities', false);

							const entities = types.get(options, 'entities', null) || xml.getEntities();

							const PTR_LEN = clibxml2._xmlPtrLen();
							const XML_INTERNAL_GENERAL_ENTITY = 1;
							const XML_INTERNAL_PREDEFINED_ENTITY = 6;

							let currentNode = null;
						
							const getStrFromXmlCharAr = function _getStrFromXmlCharAr(ptr, index, /*optional*/end) {
								if (types.isNothing(end)) {
									return clibxml2.Pointer_stringify(clibxml2.getValue(ptr + (PTR_LEN * index), '*'));
								} else {
									const startPtr = clibxml2.getValue(ptr + (PTR_LEN * index), '*');
									const endPtr = clibxml2.getValue(ptr + (PTR_LEN * end), '*');
									return clibxml2.Pointer_stringify(startPtr, endPtr - startPtr);
								};
							};

							const SAX_HANDLERS = {
								//error: function error(ctxPtr, msgPtr, params) {
								//	if (stream) {
								//		stream.stopListening();
								//		stream = null;
								//	};
								//	//// TODO: Use "*printf"
								//	//throw new types.Error("Parse error.");
								//},
								//warning: function warning(ctxPtr, msgPtr, params) {
								//	// TODO: Manage warnings
								//},
								resolveEntity: function resolveEntity(ctxPtr, publicIdStrPtr, systemIdStrPtr) {
									debugger;
								},
								getEntity: function getEntity(ctxPtr, namePtr) {
									const name = clibxml2.Pointer_stringify(namePtr);
									if (!allocatedEntities) {
										allocatedEntities = types.nullObject();
									};
									const resolved = types.get(allocatedEntities, name);
									if (resolved) {
										return allocatedEntities[name];
									};
									const entity = types.get(entities, name);
									if (!entity) {
										return NULL;
									};
									let newNamePtr = NULL,
										strPtr = NULL;
									try {
										newNamePtr = __Internal__.createStrPtr(name);
										if (!newNamePtr) {
											throw new types.Error("Failed to allocate string buffer.");
										};
										strPtr = __Internal__.createStrPtr(entity);
										if (!strPtr) {
											throw new types.Error("Failed to allocate string buffer.");
										};
										const entityPtr = clibxml2._xmlNewEntity(NULL, newNamePtr, (discardEntities ? XML_INTERNAL_PREDEFINED_ENTITY : XML_INTERNAL_GENERAL_ENTITY), NULL, NULL, strPtr);
										if (!entityPtr) {
											throw new types.Error("Failed to allocate a new entity.");
										};
										allocatedEntities[name] = entityPtr;
										return entityPtr;
									} catch (ex) {
										throw ex;
									} finally {
										if (newNamePtr) {
											clibxml2._free(newNamePtr);
										};
										if (strPtr) {
											clibxml2._free(strPtr);
										};
									};
								},
								externalSubset: function externalSubset(ctxPtr, namePtr, externalIDPtr, systemIDPtr) {
									const node = new xml.DocumentType(clibxml2.Pointer_stringify(namePtr)); 
									//node.fileLine = parser.line + 1;
									//node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									} else {
										doc.setDocumentType(node);
									};
								},
								processingInstruction: function processingInstruction(ctxPtr, targetPtr, dataPtr) {
									const node = new xml.ProcessingInstruction(clibxml2.Pointer_stringify(targetPtr), clibxml2.Pointer_stringify(dataPtr)); 
									//node.fileLine = parser.line + 1;
									//node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									} else {
										doc.getInstructions().append(node);
									};
								},
								comment: function comment(ctxPtr, valuePtr) {
									const node = new xml.Comment(clibxml2.Pointer_stringify(valuePtr)); 
									//node.fileLine = parser.line + 1;
									//node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									} else {
										currentNode.getChildren().append(node);
									};
								},
								startElementNs: function startElementNs(ctxPtr, localnameStrPtr, prefixStrPtr, uriStrPtr, nb_namespaces, namespacesPtrStrPtr, nb_attributes, nb_defaulted, attributesPtrStrPtr) {
									const node = new xml.Element(clibxml2.Pointer_stringify(localnameStrPtr), clibxml2.Pointer_stringify(prefixStrPtr), clibxml2.Pointer_stringify(uriStrPtr));
									//node.fileLine = parser.line + 1;
									//node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									} else {
										currentNode.getChildren().append(node);
										currentNode = node;
									};
									const attrs = (nodoc ? null : currentNode.getAttrs());
									for (var i = 0; i < nb_attributes; i++) {
										// localname/prefix/URI/value/end
										const ptr = attributesPtrStrPtr + (PTR_LEN * 5 * i);
										const node = new xml.Attribute(/*name*/getStrFromXmlCharAr(ptr, 0), /*value*/getStrFromXmlCharAr(ptr, 3, 4), /*prefix*/getStrFromXmlCharAr(ptr, 1), /*uri*/getStrFromXmlCharAr(ptr, 2)); 
										//node.fileLine = line + 1;
										//node.fileColumn = column + 1;
										if (nodoc) {
											callback(node);
										} else {
											attrs.append(node);
										};
									};
								},
								characters: function characters(ctxPtr, chPtr, len) {
									const node = new xml.Text(clibxml2.Pointer_stringify(chPtr, len)); 
									//node.fileLine = parser.line + 1;
									//node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									} else {
										currentNode.getChildren().append(node);
									};
								},
								cdataBlock: function cdataBlock(ctxPtr, valuePtr, len) {
									const node = new xml.CDATASection(clibxml2.Pointer_stringify(valuePtr, len)); 
									//node.fileLine = parser.line + 1;
									//node.fileColumn = parser.column + 1;
									if (nodoc) {
										callback(node);
									} else {
										currentNode.getChildren().append(node);
									};
								},
								endElementNs: function endElementNs(ctxPtr, localnameStrPtr, prefixStrPtr, uriStrPtr) {
									if (!nodoc) {
										currentNode = currentNode.getParent();
									};
								},
								endDocument: function endDocument(ctxPtr) {
									if (nodoc) {
										callback(null);
									};
									resolve(doc);
									if (stream) {
										stream.stopListening();
										stream = null;
									};
								},
							};

							const allocFunction = function _allocFunction(name) {
								const fn = types.get(SAX_HANDLERS, name, null);
								let ptr = NULL;
								if (fn) {
									ptr = clibxml2.Runtime.addFunction(fn);
									if (!ptr) {
										throw new types.Error("Failed to allocate function '~0~' for the SAXHandler.", [name]);
									};
									if (!allocatedFunctions) {
										allocatedFunctions = [];
									};
 									allocatedFunctions.push(ptr);
								};
								return ptr;
							};

							sax = clibxml2._xmlCreateMySAXHandler(
									allocFunction('internalSubset'),
									allocFunction('isStandalone'),
									allocFunction('hasInternalSubset'),
									allocFunction('hasExternalSubset'),
									allocFunction('resolveEntity'),
									allocFunction('getEntity'),
									allocFunction('entityDecl'),
									allocFunction('notationDecl'),
									allocFunction('attributeDecl'),
									allocFunction('elementDecl'),
									allocFunction('unparsedEntityDecl'),
									allocFunction('setDocumentLocator'),
									allocFunction('startDocument'),
									allocFunction('endDocument'),
									allocFunction('startElement'),
									allocFunction('endElement'),
									allocFunction('reference'),
									allocFunction('characters'),
									allocFunction('ignorableWhitespace'),
									allocFunction('processingInstruction'),
									allocFunction('comment'),
									allocFunction('warning'),
									allocFunction('error'),
									allocFunction('getParameterEntity'),
									allocFunction('cdataBlock'),
									allocFunction('externalSubset'),
									allocFunction('startElementNs'),
									allocFunction('endElementNs'),
									allocFunction('serror')
							);
							if (!sax) {
								throw new types.Error("Failed to create SAXHandler.");
							};
							saxOrg = sax;

							userPtr = clibxml2._malloc(4); // TODO: SCHEMA_PLUG_PTR_LEN
							if (!userPtr) {
								throw new types.Error("Failed to create user context.");
							};
							userPtrOrg = userPtr;
							clibxml2.setValue(userPtr, 0, 'i32');

							if (xsdContent) {
								urlPtr = __Internal__.createStrPtr(xsd.toApiString());
								if (!urlPtr) {
									throw new types.Error("Failed to allocate URL string.");
								};
								schemaParserCtxt = clibxml2._xmlSchemaNewParserCtxt(urlPtr /*, userPtr WHEN POSSIBLE. FOR NOW, IT IS EQUAL TO schemaParserCtxt */);
								if (!schemaParserCtxt) {
									throw new types.Error("Failed to create schema parser.");
								};

								//clibxml2._xmlSchemaSetParserErrors(schemaParserCtxt, allocFunction('error'), allocFunction('warning'));

								schema = clibxml2._xmlSchemaParse(schemaParserCtxt);
								if (!schema) {
									throw new types.Error("Failed to parse schema.");
								};

								clibxml2._free(urlPtr); // free memory
								urlPtr = NULL;
								__Internal__.unregisterBaseDirectory(schemaParserCtxt); // Use userPtrOrg   WHEN POSSIBLE
								clibxml2._xmlSchemaFreeParserCtxt(schemaParserCtxt);
								schemaParserCtxt = NULL;

								validCtxt = clibxml2._xmlSchemaNewValidCtxt(schema);
								if (!validCtxt) {
									throw new types.Error("Failed to create schema validator.");
								};

								//clibxml2._xmlSchemaSetValidErrors(validCtxt, allocFunction('error'), allocFunction('warning'), userPtr);

								saxPtr = clibxml2._malloc(PTR_LEN);   // TODO: SAX_HANDLER_PTR_LEN
								if (!saxPtr) {
									throw new types.Error("Failed to create SAX pointer.");
								};
								clibxml2.setValue(saxPtr, sax, '*');
								userPtrPtr = clibxml2._malloc(PTR_LEN);  // TODO: VOID_PTR_LEN
								if (!userPtrPtr) {
									throw new types.Error("Failed to create user context pointer.");
								};
								clibxml2.setValue(userPtrPtr, userPtr, '*');
								saxPlug = clibxml2._xmlSchemaSAXPlug(validCtxt, saxPtr, userPtrPtr);
								if (!saxPlug) {
									throw new types.Error("Failed to plug schema with SAX.");
								};
								sax = clibxml2.getValue(saxPtr, '*');
								userPtr = clibxml2.getValue(userPtrPtr, '*');
							};

							let callback = types.get(options, 'callback');
							if (callback) {
								const cbObj = types.get(options, 'callbackObj');
								callback = doodad.Callback(cbObj, callback);
							};
					
							const doc = (nodoc ? null : new xml.Document());

							currentNode = doc;
						
							pushParserCtxt = clibxml2._xmlCreatePushParserCtxt(sax, userPtr, NULL, 0, NULL);
							if (!pushParserCtxt) {
								throw new types.Error("Failed to create push parser.");
							};

							if (types.isString(stream)) {
							} else {
								stream.onReady.attach(this, function(ev) {
									ev.preventDefault();
									let valuePtr = NULL;
									try {
										if (ev.data.raw === io.EOF) {
											const res = clibxml2._xmlParseChunk(pushParserCtxt, NULL, 0, 1);
											if (res) {
												throw new types.Error("Failed to close document.");
											};
										} else {
											const value = ev.data.valueOf();
											if (types.isString(value)) {
												const len = clibxml2.lengthBytesUTF8(value);
												valuePtr = __Internal__.createStrPtr(value, len);
												if (!valuePtr) {
													throw new types.Error("Failed to allocate string buffer.");
												};
												const res = clibxml2._xmlParseChunk(pushParserCtxt, valuePtr, len, 0);
												if (res) {
													throw new types.Error("Failed to parse chunk.");
												};
											} else {
												// TODO: Non UTF-8
												valuePtr = clibxml2.allocate(value, 'i8', clibxml2.ALLOC_NORMAL);
												if (!valuePtr) {
													throw new types.Error("Failed to allocate value buffer.");
												};
												const res = clibxml2._xmlParseChunk(pushParserCtxt, valuePtr, value.length, 0);
												if (res) {
													throw new types.Error("Failed to parse chunk.");
												};
											};
										};
									} catch(ex) {
										reject(ex);
									} finally {
										if (valuePtr) {
											clibxml2._free(valuePtr);
											valuePtr = NULL;
										};
									};
								});
								stream.listen();
							};
						})
						.nodeify(function(err, result) {
							if (pushParserCtxt) {
								clibxml2._xmlFreeParserCtxt(pushParserCtxt);
								pushParserCtxt = NULL;
							};

							if (saxPlug) {
								clibxml2._xmlSchemaSAXUnplug(saxPlug);
								saxPlug = NULL;
								//sax = NULL;  <PRB> Code commented because "sax" returned from "xmlSchemaSAXPlug" is not freed
								userPtr = NULL; // OK
							};

							if (validCtxt) {
								clibxml2._xmlSchemaFreeValidCtxt(validCtxt);
								validCtxt = NULL;
							};

							if (schema) {
								clibxml2._xmlSchemaFree(schema);
								schema = NULL;
							};

							if (schemaParserCtxt) {
								__Internal__.unregisterBaseDirectory(schemaParserCtxt); // Use userPtrOrg   WHEN POSSIBLE
								clibxml2._xmlSchemaFreeParserCtxt(schemaParserCtxt);
								schemaParserCtxt = NULL;
							};

							if (urlPtr) {
								clibxml2._free(urlPtr);
								urlPtr = NULL;
							};

							if (allocatedFunctions) {
								tools.forEach(allocatedFunctions, function(ptr) {
									clibxml2.Runtime.removeFunction(ptr);
								});
								allocatedFunctions = null;
							};

							if (allocatedEntities) {
								tools.forEach(allocatedEntities, function(ptr) {
									clibxml2._xmlFreeEntity(ptr);
								});
								allocatedEntities = null;
							};

							if (saxPtr) {
								clibxml2._free(saxPtr);
								saxPtr = NULL;
							};

							if (sax && (sax !== saxOrg)) {
								clibxml2._xmlFreeEx(sax);
								sax = NULL;
							};

							if (saxOrg) {
								clibxml2._xmlFreeMySAXHandler(saxOrg);
								saxOrg = NULL;
							};

							if (userPtrPtr) {
								clibxml2._free(userPtrPtr);
								userPtrPtr = NULL;
							};

							if (userPtr && (userPtr !== userPtrOrg)) {
								clibxml2._xmlFreeEx(userPtr);
								userPtr = NULL;
							};

							if (userPtrOrg) {
								clibxml2._free(userPtrOrg);
								userPtrOrg = NULL;
							};

							clibxml2 = null;

							if (err) {
								throw err;
							} else {
								return result;
							};
						})
						.catch(__Internal__.trapCAborted);

						return promise;
					});
				});
				
				libxml2.ADD('isAvailable', function isAvailable() {
					return !!libxml2Loader.get();
				});
				
				libxml2.ADD('hasSchemas', function hasSchemas() {
					// <PRB> libxml2 schema files loader is not Asynchronous so we can't use schemas on the client.
					// <PRB> libxml2's schema validation is not ready for procuction use with Node because of it's synchronous design.
					return root.serverSide && root.getOptions().debug;
				});
				

				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					try {
						__Internal__.initLibxml2();
					} catch(ex) {
						__Internal__.trapCAborted(ex);
					};

					xml.registerParser(libxml2);
				};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()
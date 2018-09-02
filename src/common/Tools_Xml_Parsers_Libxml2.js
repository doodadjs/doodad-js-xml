//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
	// doodad-js - Object-oriented programming framework
	// File: Tools_Xml_Parsers_Libxml2.js - libxml2 XML parser
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

/* eslint camelcase: "off", id-match: "off" */  // Mixing C and JS

//! IF_SET("mjs")
//! ELSE()
	"use strict";
//! END_IF()

exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.Tools.Xml.Parsers.Libxml2'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.Tools.Xml',
			'Doodad.Tools.Xml.Parsers.Libxml2.Loader',
			{
				name: 'Doodad.Tools.Xml.Parsers.Libxml2.Errors',
				optional: true,
			},
		],

		create: function create(root, /*optional*/_options, _shared) {
			//===================================
			// Namespaces
			//===================================

			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
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
				initialized: false,
				ready: false,
				createStrPtr: null,
				parserData: null,

				DEFAULT_WORKERS_COUNT: 5,
				workers: null,
			};

			//===================================
			// Options
			//===================================

			let __options__ = tools.nullObject({
				workersCount: 5, // Number of workers
			});

			__Internal__._setOptions = function setOptions(...args) {
				const newOptions = tools.nullObject(__options__, ...args);

				newOptions.workersCount = types.toInteger(newOptions.workersCount);

				return newOptions;
			};

			libxml2.ADD('getOptions', function getOptions() {
				return __options__;
			});

			libxml2.ADD('setOptions', function setOptions(...args) {
				const newOptions = __Internal__._setOptions(...args);

				if (newOptions.secret !== _shared.SECRET) {
					throw new types.AccessDenied("Secrets mismatch.");
				};

				delete newOptions.secret;

				__options__ = types.freezeObject(newOptions);

				return __options__;
			});

			__options__ = types.freezeObject(__Internal__._setOptions(_options));

			//===================================
			// Libxml2 Parser (single thread)
			//===================================

			__Internal__.registerOptions = function _registerOptions(schemaParserCtxt, options) {
				if (!__Internal__.parserData) {
					__Internal__.parserData = new types.Map();
				};
				if (__Internal__.parserData.has(schemaParserCtxt)) {
					const data = __Internal__.parserData.get(schemaParserCtxt);
					data.options = options;
				} else {
					__Internal__.parserData.set(schemaParserCtxt, {options});
				};
			};

			__Internal__.registerBaseDirectory = function _registerBaseDirectory(schemaParserCtxt, url) {
				if (!__Internal__.parserData) {
					__Internal__.parserData = new types.Map();
				};
				const directory = url.set({file: ''});
				const directoryStr = directory.toApiString();
				if (__Internal__.parserData.has(schemaParserCtxt)) {
					const data = __Internal__.parserData.get(schemaParserCtxt);
					let dirs = data.dirs;
					if (!dirs) {
						dirs = [];
						data.dirs = dirs;
					};
					const len = dirs.length;
					let found = false;
					for (let i = 0; i < len; i++) {
						const dir = dirs[i];
						if (dir[0] === directoryStr) {
							found = true;
							break;
						};
					};
					if (!found) {
						dirs.push([directoryStr, directory]);
					};
				} else {
					__Internal__.parserData.set(schemaParserCtxt, {dirs: [[directoryStr, directory]]});
				};
			};

			__Internal__.unregisterParserData = function unregisterParserData(schemaParserCtxt) {
				if (!__Internal__.parserData || !__Internal__.parserData.has(schemaParserCtxt)) {
					throw new types.Error("Data not registered on schema parser '~0~'.", [schemaParserCtxt]);
				};
				__Internal__.parserData.delete(schemaParserCtxt);
			};

			__Internal__.getParserData = function getParserData(schemaParserCtxt) {
				if (__Internal__.parserData) {
					return __Internal__.parserData.get(schemaParserCtxt);
				};
				return undefined;
			};

			libxml2.REGISTER(types.ScriptAbortedError.$inherit(
				/*typeProto*/
				{
					$TYPE_NAME: 'AbortError',
					$TYPE_UUID: /*! REPLACE_BY(TO_SOURCE(UUID('Libxml2AbortError')), true) */ null /*! END_REPLACE() */,

					[types.ConstructorSymbol](what) {
						this.what = what;
						return [1, "Script aborted : '~0~'.", [what]];
					}
				},
				/*instanceProto*/
				{
					what: null,
				}));

			__Internal__.initClibxml2 = function initClibxml2(initOpts) {
				// NOTE: Not Async, but made Async-proof for the future...
				const Promise = types.getPromise();
				return Promise.try(function initClibxml2Promise() {
					const clibxml2 = libxml2Loader.get();
					if (!clibxml2) {
						return;
					};

					clibxml2.onExit = function onExit(status) {
						tools.abortScript(status);
					};

					clibxml2.onAbort = function onAbort(what) {
						throw new libxml2.AbortError(what);
					};

					clibxml2._xmlInitParser();

					const matchFuncPtr = clibxml2.addFunction(function matchFunc(filenameStrPtr) {
						// Force selection of our handlers.
						return 1;
					}, 'ii');

					const openFuncPtr = clibxml2.addFunction(function openFunc(filenameStrPtr) {
						// Disable file system access
						return NULL;
					}, 'ii');

					const readFuncPtr = clibxml2.addFunction(function readFunc(inputContextPtr, bufferPtr, bufferLen) {
						// Disable file system access
						return 0;
					}, 'iiii');

					const writeFuncPtr = clibxml2.addFunction(function writeFunc(inputContextPtr, bufferPtr, bufferLen) {
						// Disable file system access
						return bufferLen;
					}, 'iiii');

					const closeFuncPtr = clibxml2.addFunction(function closeFunc(inputContextPtr) {
						// Disable file system access
						return 0;
					}, 'ii');

					//const readExternalFunPtr = clibxml2.addFunction(function readExternalFunc(readContextPtr, bufferPtr, bufferLen) {
					//	types.DEBUGGER();
					//}, 'viii');

					//const closeExternalFuncPtr = clibxml2.addFunction(function closeExternalFunc(readContextPtr) {
					//	clibxml2._free(readContextPtr);
					//	readContextPtr = NULL;
					//}, 'vi');

					//const externalLoaderPtr = clibxml2.addFunction(function externalLoader(urlStrPtr, idStrPtr, parserCtxtPtr) {
					//	const path = xsd.set({file: null}).combine(clibxml2.Pointer_stringify(urlStrPtr));
					//	const readContextPtr = clibxml2._malloc(....);
					//	const inputPtr = clibxml2._xmlCreateMyParserInput(parserCtxtPtr, readContextPtr, readExternalFuncPtr, closeExternalFuncPtr);
					//	return inputPtr;
					//}, 'iiii');

					const externalLoaderPtr = clibxml2.addFunction(function externalLoader(urlStrPtr, idStrPtr, parserCtxtPtr) {
						// TODO: Read and store base directory from/to "userDataPtr" when "xmlSchemaNewParserCtxt" will accept a "userData" argument.

						const url = files.parseLocation(clibxml2.Pointer_stringify(urlStrPtr));

						const userDataPtr = clibxml2._xmlGetUserDataFromParserCtxt(parserCtxtPtr);
						if (!userDataPtr) {
							throw new types.Error("The 'libxml2' C library needs some modifications before its build.");
						};

						let content = null;
						const data = __Internal__.getParserData(userDataPtr);
						const encoding = types.get(data.options, 'encoding', null);

						if (url.isRelative) {
							const dirs = data.dirs,
								len = dirs.length;
							for (let i = 0; i < len; i++) {
								const path = dirs[i][1].combine(url/*, {includePathInRoot: false}*/);
								try {
									content = files.readFileSync(path, {encoding});
									__Internal__.registerBaseDirectory(userDataPtr, path);
									break;
								} catch(ex) {
									if (ex.code !== 'ENOENT') {
										throw ex;
									};
								};
							};
						} else {
							content = files.readFileSync(url, {encoding});
							__Internal__.registerBaseDirectory(userDataPtr, url);
						};

						//console.log(path.toApiString());

						if (!content) {
							return NULL;
						};

						let contentPtr = NULL;
						let contentLen = 0;
						//let filenamePtr = NULL;
						try {
							if (types.isString(content)) {
								contentLen = clibxml2.lengthBytesUTF8(content);
								contentPtr = __Internal__.createStrPtr(content, contentLen);
							} else {
								contentLen = content.length;
								contentPtr = clibxml2.allocate(content, 'i8', clibxml2.ALLOC_NORMAL);
							};
							content = null; // free memory
							if (!contentPtr) {
								throw new types.Error("Failed to allocate file buffer.");
							};
							//const filename = path.toApiString();
							//filenamePtr = createStrPtr(filename, clibxml2.lengthBytesUTF8(filename));
							//if (!filenamePtr) {
							//	throw new types.Error("Failed to allocate buffer for file name.");
							//};
							const inputPtr = clibxml2._xmlCreateMyParserInput(parserCtxtPtr, contentPtr, contentLen/*, filenamePtr*/);
							return inputPtr;
						} finally {
							//if (filenamePtr) {
							//	clibxml2._free(filenamePtr);
							//	filenamePtr = NULL;
							//};
							if (contentPtr) {
								clibxml2._free(contentPtr);
								contentPtr = NULL;
							};
						};
					}, 'iiii');

					// Disable file system access
					clibxml2._xmlCleanupInputCallbacks();
					clibxml2._xmlCleanupOutputCallbacks();
					clibxml2._xmlRegisterInputCallbacks(matchFuncPtr, openFuncPtr, readFuncPtr, closeFuncPtr);
					clibxml2._xmlRegisterOutputCallbacks(matchFuncPtr, openFuncPtr, writeFuncPtr, closeFuncPtr);

					// Set our external loader.
					clibxml2._xmlSetExternalEntityLoader(externalLoaderPtr);

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

					__Internal__.initialized = true;
				});
			};

			__Internal__.parseWithClibxml2 = function parseWithClibxml2(stream, options) {
				// NOTE: "parse" is Async

				const Promise = types.getPromise();

				let clibxml2 = null,
					clibxml2Cleaned = false,
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

				return Promise.create(function parseWithClibxml2Promise(resolve, reject) {
					clibxml2 = libxml2Loader.get();
					if (!clibxml2) {
						throw new types.NotAvailable("The 'libxml2' library is not available.");
					};

					const nodoc = types.get(options, 'nodoc', false),
						discardEntities = types.get(options, 'discardEntities', false),
						entities = types.get(options, 'entities', null),
						xsd = types.get(options, 'xsd', null),
						encoding = types.get(options, 'encoding', null),
						callback = types.get(options, 'callback', null);

					const PTR_LEN = clibxml2._xmlPtrLen();
					const XML_INTERNAL_GENERAL_ENTITY = 1;
					const XML_INTERNAL_PREDEFINED_ENTITY = 6;

					let currentNode = null;

					const doc = (nodoc ? null : new xml.Document());

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
						error: function error(ctxPtr, msgPtr, paramsPtr) {
							const strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
							const str = clibxml2.Pointer_stringify(strPtr);
							if (str) {
								tools.log(tools.LogLevels.Error, tools.trim(str, '\n'));
							};
						},
						warning: function warning(ctxPtr, msgPtr, paramsPtr) {
							const strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
							const str = clibxml2.Pointer_stringify(strPtr);
							if (str && (str.indexOf("Skipping import of schema") < 0)) {
								tools.log(tools.LogLevels.Warning, tools.trim(str, '\n'));
							};
						},
						//serror: function serror(userDataPtr, errorPtr) {
						//	types.DEBUGGER();
						//},
						//resolveEntity: function resolveEntity(ctxPtr, publicIdStrPtr, systemIdStrPtr) {
						//	types.DEBUGGER();
						//},
						getEntity: function getEntity(ctxPtr, namePtr) {
							const name = clibxml2.Pointer_stringify(namePtr);
							if (name === '__proto__') {
								return NULL;
							};
							if (!allocatedEntities) {
								allocatedEntities = tools.nullObject();
							};
							const ptr = types.get(allocatedEntities, name);
							if (ptr) {
								return ptr;
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
							for (let i = 0; i < nb_attributes; i++) {
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

					const allocFunction = function _allocFunction(name, sig) {
						if (!allocatedFunctions) {
							allocatedFunctions = tools.nullObject();
						};
						if (name in allocatedFunctions) {
							return allocatedFunctions[name];
						};
						const fn = types.get(SAX_HANDLERS, name, null);
						let ptr = NULL;
						if (fn) {
							ptr = clibxml2.addFunction(fn, sig);
							if (!ptr) {
								throw new types.Error("Failed to allocate function '~0~' for the SAXHandler.", [name]);
							};
							allocatedFunctions[name] = ptr;
						};
						return ptr;
					};

					sax = clibxml2._xmlCreateMySAXHandler(
						allocFunction('internalSubset', 'viiii'),
						allocFunction('isStandalone', 'ii'),
						allocFunction('hasInternalSubset', 'ii'),
						allocFunction('hasExternalSubset', 'ii'),
						allocFunction('resolveEntity', 'iiii'),
						allocFunction('getEntity', 'iii'),
						allocFunction('entityDecl', 'viiiiii'),
						allocFunction('notationDecl', 'viiii'),
						allocFunction('attributeDecl', 'viiiiiii'),
						allocFunction('elementDecl', 'viiii'),
						allocFunction('unparsedEntityDecl', 'viiiii'),
						allocFunction('setDocumentLocator', 'vii'),
						allocFunction('startDocument', 'vi'),
						allocFunction('endDocument', 'vi'),
						allocFunction('startElement', 'viii'),
						allocFunction('endElement', 'vii'),
						allocFunction('reference', 'vii'),
						allocFunction('characters', 'viii'),
						allocFunction('ignorableWhitespace', 'viii'),
						allocFunction('processingInstruction', 'viii'),
						allocFunction('comment', 'vii'),
						allocFunction('warning', 'viii'),
						allocFunction('error', 'viii'),
						allocFunction('getParameterEntity', 'iii'),
						allocFunction('cdataBlock', 'viii'),
						allocFunction('externalSubset', 'viiii'),
						allocFunction('startElementNs', 'viiiiiiiii'),
						allocFunction('endElementNs', 'viiii'),
						allocFunction('serror', 'vii')
					);
					if (!sax) {
						throw new types.Error("Failed to create SAXHandler.");
					};
					saxOrg = sax;

					userPtr = clibxml2._malloc(4);
					if (!userPtr) {
						throw new types.Error("Failed to create user context.");
					};
					userPtrOrg = userPtr;
					clibxml2.setValue(userPtr, 0, 'i32');

					if (xsd) {
						urlPtr = __Internal__.createStrPtr(xsd.toApiString());
						if (!urlPtr) {
							throw new types.Error("Failed to allocate URL string.");
						};
						schemaParserCtxt = clibxml2._xmlSchemaNewParserCtxt(urlPtr /*, userPtr WHEN POSSIBLE. FOR NOW, IT IS EQUAL TO schemaParserCtxt */);
						if (!schemaParserCtxt) {
							throw new types.Error("Failed to create schema parser.");
						};

						__Internal__.registerOptions(schemaParserCtxt, {encoding});

						clibxml2._xmlSchemaSetParserErrors(schemaParserCtxt, allocFunction('error', 'viii'), allocFunction('warning', 'viii'), NULL);

						schema = clibxml2._xmlSchemaParse(schemaParserCtxt);
						if (!schema) {
							throw new types.Error("Failed to parse schema.");
						};

						clibxml2._free(urlPtr); // free memory
						urlPtr = NULL;
						__Internal__.unregisterParserData(schemaParserCtxt); // Use userPtrOrg   WHEN POSSIBLE
						clibxml2._xmlSchemaFreeParserCtxt(schemaParserCtxt);
						schemaParserCtxt = NULL;

						validCtxt = clibxml2._xmlSchemaNewValidCtxt(schema);
						if (!validCtxt) {
							throw new types.Error("Failed to create schema validator.");
						};

						clibxml2._xmlSchemaSetValidErrors(validCtxt, allocFunction('error', 'viii'), allocFunction('warning', 'viii'), userPtr);

						saxPtr = clibxml2._malloc(PTR_LEN);
						if (!saxPtr) {
							throw new types.Error("Failed to create SAX pointer.");
						};
						clibxml2.setValue(saxPtr, sax, '*');
						userPtrPtr = clibxml2._malloc(PTR_LEN);
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

					if (!nodoc && !discardEntities) {
						tools.forEach(entities, function(value, name) {
							const node = new xml.Entity(name, value);
							if (nodoc) {
								callback(node);
							} else {
								doc.getEntities().append(node);
							};
						});
					};

					currentNode = doc;

					pushParserCtxt = clibxml2._xmlCreatePushParserCtxt(sax, userPtr, NULL, 0, NULL);
					if (!pushParserCtxt) {
						throw new types.Error("Failed to create push parser.");
					};

					if (types.isString(stream)) {
						let valuePtr = NULL;
						try {
							const len = clibxml2.lengthBytesUTF8(stream);
							valuePtr = __Internal__.createStrPtr(stream, len);
							if (!valuePtr) {
								throw new types.Error("Failed to allocate string buffer.");
							};
							stream = null;
							const parseRes = clibxml2._xmlParseChunk(pushParserCtxt, valuePtr, len, 1);
							let isValid = (parseRes === 0);
							if (isValid && validCtxt) {
								const res = clibxml2._xmlSchemaIsValid(validCtxt);
								isValid = (res > 0);
							};
							if (!isValid) {
								if (parseRes === 0) {
									throw new types.ParseError("Invalid XML document (based on the schema).");
								} else {
									throw new types.ParseError("Invalid XML document: '~0~'.", [libxml2.getParserMessage(parseRes)]);
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
					} else {
						stream.onError.attachOnce(null, function(ev) {
							ev.preventDefault();
							reject(ev.error);
						});
						stream.onReady.attach(null, function(ev) {
							ev.preventDefault();
							let valuePtr = NULL;
							try {
								let parseRes = 0;
								if (ev.data.raw === io.EOF) {
									parseRes = clibxml2._xmlParseChunk(pushParserCtxt, NULL, 0, 1);
								} else {
									const value = ev.data.valueOf();
									if (types.isString(value)) {
										const len = clibxml2.lengthBytesUTF8(value);
										valuePtr = __Internal__.createStrPtr(value, len);
										if (!valuePtr) {
											throw new types.Error("Failed to allocate string buffer.");
										};
										parseRes = clibxml2._xmlParseChunk(pushParserCtxt, valuePtr, len, 0);
									} else {
										// TODO: Non UTF-8
										valuePtr = clibxml2.allocate(value, 'i8', clibxml2.ALLOC_NORMAL);
										if (!valuePtr) {
											throw new types.Error("Failed to allocate value buffer.");
										};
										parseRes = clibxml2._xmlParseChunk(pushParserCtxt, valuePtr, value.length, 0);
									};
								};
								let isValid = (parseRes === 0);
								if (isValid && validCtxt) {
									const res = clibxml2._xmlSchemaIsValid(validCtxt);
									isValid = (res > 0);
								};
								if (!isValid) {
									if (parseRes === 0) {
										throw new types.ParseError("Invalid XML document (based on the schema).");
									} else {
										throw new types.ParseError("Invalid XML document: '~0~'.", [libxml2.getParserMessage(parseRes)]);
									};
								};

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
							//sax = NULL;  <PRB> Code commented because "sax" returned from "xmlSchemaSAXPlug" is not freed by "xmlSchemaSAXUnplug".
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
							try {
								__Internal__.unregisterParserData(schemaParserCtxt); // Use userPtrOrg   WHEN POSSIBLE
							} catch(ex) {
								// Ignore
							};
							clibxml2._xmlSchemaFreeParserCtxt(schemaParserCtxt);
							schemaParserCtxt = NULL;
						};

						if (urlPtr) {
							clibxml2._free(urlPtr);
							urlPtr = NULL;
						};

						if (allocatedFunctions) {
							tools.forEach(allocatedFunctions, function(ptr, name) {
								clibxml2.removeFunction(ptr);
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

						clibxml2Cleaned = true;

						if (err) {
							throw err;
						} else {
							return result;
						};
					})
					.catch(function(err) {
						if (!clibxml2Cleaned && !types._instanceof(err, libxml2.AbortError)) {
							// Lixml2 is unstable because its cleanup has failed, force abort.
							throw new libxml2.AbortError(err);
						};
						throw err;
					});
			};

			//=========================
			// Workers (multi-threads)
			//=========================

			__Internal__.initWorkers = function initWorkers(initOpts) {
				// NOTE: Async
				const Promise = types.getPromise();
				return Promise.create(function initWorkersPromise(resolve, reject) {
					const options = libxml2.getOptions(),
						count = options.workersCount;

					if ((count <= 0) || types.isInfinite(count) || !libxml2Loader.WorkerWrapper || !libxml2Loader.WorkerWrapper.$isAvailable()) {
						resolve();
						return;
					};

					__Internal__.workers = [];

					let ready = 0,
						errorCb = null,
						readyCb = null,
						terminateCb = null;

					const detach = function _detach() {
						tools.forEach(__Internal__.workers, function forEachWorker(worker) {
							worker.removeEventListener('error', errorCb);
							worker.removeEventListener('ready', readyCb);
						});
					};

					const shutdown = function _shutdown() {
						detach();
						tools.forEach(__Internal__.workers, function forEachWorker(worker) {
							worker.close();
						});
						__Internal__.workers = null;
					};

					const create = function _create(number) {
						const worker = new libxml2Loader.WorkerWrapper(number);
						worker.addEventListener('error', errorCb);
						worker.addEventListener('ready', readyCb);
						worker.addEventListener('terminate', terminateCb);
						return worker;
					};

					errorCb = function _errorCb(ev) {
						shutdown();
						reject(ev.detail);
					};

					readyCb = function _readyCb(ev) {
						ready++;
						if (ready >= count) {
							detach();
							resolve();
							__Internal__.initialized = true;
						};
					};

					terminateCb = function _terminateCb(ev) {
						if (ev.detail.exitCode !== 0) {
							const number = ev.detail.number;
							const prevWorker = __Internal__.workers[number];
							types.DESTROY(prevWorker);
							const newWorker = create(number);
							__Internal__.workers[number] = newWorker;
						};
					};

					for (let i = 0; i < count; i++) {
						const worker = create(i);
						__Internal__.workers.push(worker);
					};
				});
			};

			__Internal__.parseWithWorker = function parseWithWorker(stream, options) {
				// NOTE: "parse" is Async
				const Promise = types.getPromise();
				return Promise.create(function parseWithWorkerPromise(resolve, reject) {
					if (!__Internal__.workers) {
						throw new types.NotAvailable("XML worker threads are not available.");
					};

					// TODO: Optimitize by replacing "filter(...)[0]" with something like a "first(...)" ?
					const worker = tools.filter(__Internal__.workers, function(worker) {
						return worker.available;
					})[0];

					if (!worker) {
						// TODO: Raise an error instead ?
						// Falls back to using 'clibxml2'.
						resolve(__Internal__.parseWithClibxml2(stream, options));
						return;
					};

					let errorCb = null,
						logCb = null,
						finishCb = null,
						terminateCb = null;

					const cleanup = function cleanup() {
						worker.removeEventListener('error', errorCb);
						worker.removeEventListener('log', logCb);
						worker.removeEventListener('finish', finishCb);
						worker.removeEventListener('terminate', terminateCb);
					};

					worker.addEventListener('error', errorCb = function(ev) {
						cleanup();
						reject(ev.detail);
					});

					worker.addEventListener('log', logCb = function(ev) {
						tools.log((ev.detail.type === 'Warning' ? tools.LogLevels.Warning : tools.LogLevels.Error), ev.detail.message);
					});

					worker.addEventListener('finish', finishCb = function(ev) {
						cleanup();
						resolve(ev.detail);
					});

					worker.addEventListener('terminate', terminateCb = function(ev) {
						cleanup();
						reject(new types.Error("The XML Worker thread has exited."));
					});

					worker.parse(stream, options);
				});
			};

			//===========================
			// Module API
			//===========================

			libxml2.ADD('parse', function(stream, /*optional*/options) {
				// NOTE: "parse" is Async
				const Promise = types.getPromise();
				return Promise.try(function parsePromise() {
					if (!__Internal__.initialized) {
						throw new types.NotAvailable("'libxml2' parser is not available.");
					};

					// TODO: MemoryStream to replace strings
					root.DD_ASSERT && root.DD_ASSERT(types._implements(stream, ioMixIns.TextInput) || types.isString(stream), "Invalid stream.");

					let xsd = types.get(options, 'xsd', '');
					//const encoding = types.get(options, 'encoding', 'utf-8');

					if (xsd) {
						if (!types._instanceof(xsd, [files.Url, files.Path])) {
							xsd = files.parseLocation(xsd);
							options = tools.extend(options, {xsd});
						};

						if (__Internal__.workers) {
							return __Internal__.parseWithWorker(stream, options);
						};
					};

					return __Internal__.parseWithClibxml2(stream, options);
				});
			});

			libxml2.ADD('isAvailable', function isAvailable() {
				if (!__Internal__.initialized) {
					return false;
				};

				return libxml2Loader.isAvailable();
			});

			libxml2.ADD('hasFeatures', function hasFeatures(features) {
				if (!__Internal__.initialized) {
					return false;
				};

				return libxml2Loader.hasFeatures(features);
			});

			libxml2.ADD('getParserMessage', function getParserMessage(parserError) {
				if (libxml2.Errors && types.isFunction(libxml2.Errors.getParserMessage)) {
					return libxml2.Errors.getParserMessage(parserError);
				} else {
					return types.toString(parserError);
				};
			});


			//===================================
			// Module Init
			//===================================
			return function init(/*optional*/options) {
				return __Internal__.initClibxml2(options)
					.then(function(dummy) {
						return __Internal__.initWorkers(options);
					})
					.then(function(dummy) {
						if (__Internal__.initialized) {
							xml.registerParser(libxml2);
						};
					});
			};
		},
	};
	return modules;
};

//! END_MODULE()

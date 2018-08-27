//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
	// doodad-js - Object-oriented programming framework
	// File: Tools_Xml_Parsers_Libxml2_Worker.js - libxml2 XML parser Worker
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

/* import {default as nodejsAssert} from 'assert'; */
/* import {default as nodejsWorker} from 'worker_threads'; */
/* import {default as doodadjs} from '@doodad-js/core'; */
/* import {default as clibxml2} from '@doodad-js/xml/lib/libxml2/libxml2.min.js'; */

"use strict";

/* eslint import/no-unresolved: "off" */  // Module "worker_threads" is available behind a flag
/* eslint import/no-extraneous-dependencies: "off" */  // Self-reference (to "@doodad-js/xml")

const nodejsAssert = require('assert'),
	nodejsWorker = require('worker_threads');

nodejsAssert.strictEqual(nodejsWorker.isMainThread, false, "That script is dedicated to a Node.js Worker thread.");

const doodadjs = require('@doodad-js/core'),
	clibxml2 = require('@doodad-js/xml/lib/libxml2/libxml2.min.js');

// Workflow: [out]Ready ==> [in]Parse(options) ==> [out]Ack ==> [in]Chunk(data) ==> [out]Ack ==> [in]Chunk(data) ==> [out]Nodes ==> [in]Ack ==> [out]Ack ==> [in]Chunk(dat: null) ==> ... ==> [out]Ready

doodadjs.createRoot(null, {node_env: (nodejsWorker.workerData.startupOpts.debug ? 'dev' : null)})
//.thenCreate(function(root, resolve, reject) {
	.then(function(root) {
		//===================================
		// Namespaces
		//===================================

		const doodad = root.Doodad,
			types = doodad.Types,
			tools = doodad.Tools,
			files = tools.Files;

		tools.trapUnhandledErrors();

		//global.Error = types.INIT( types.Error.$inherit({$TYPE_NAME: 'Error'}, {_new: types.SUPER(function(...args) {console.log(args); this._super(...args);})}) );

		//===================================
		// Internal
		//===================================

		const NULL = 0;

		let parserData = null;

		//===================================
		// Libxml2 Parser
		//===================================

		const registerOptions = function _registerOptions(schemaParserCtxt, options) {
			if (!parserData) {
				parserData = new types.Map();
			};
			if (parserData.has(schemaParserCtxt)) {
				const data = parserData.get(schemaParserCtxt);
				data.options = options;
			} else {
				parserData.set(schemaParserCtxt, {options});
			};
		};

		const registerBaseDirectory = function _registerBaseDirectory(schemaParserCtxt, url) {
			if (!parserData) {
				parserData = new types.Map();
			};
			const directory = url.set({file: ''});
			const directoryStr = directory.toApiString();
			if (parserData.has(schemaParserCtxt)) {
				const data = parserData.get(schemaParserCtxt);
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
				parserData.set(schemaParserCtxt, {dirs: [[directoryStr, directory]]});
			};
		};

		const unregisterParserData = function _unregisterParserData(schemaParserCtxt) {
			if (!parserData || !parserData.has(schemaParserCtxt)) {
				throw new types.Error("Base directory not registered on schema parser '~0~'.", [schemaParserCtxt]);
			};
			parserData.delete(schemaParserCtxt);
		};

		const getParserData = function _getParserData(schemaParserCtxt) {
			if (parserData) {
				return parserData.get(schemaParserCtxt);
			};
			return undefined;
		};

		const createStrPtr = function _createStrPtr(str, /*optional*/len) {
			if (types.isNothing(len)) {
				len = clibxml2.lengthBytesUTF8(str);
			};
			const ptr = clibxml2._malloc(len + 1);
			if (ptr) {
				clibxml2.stringToUTF8(str, ptr, len + 1);
			};
			return ptr;
		};

		const AbortError = types.INIT(types.ScriptAbortedError.$inherit(
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

		let startParse;  // no-use-before-define

		const listen = function _listen(dataPort) {
			root.DD_ASSERT && root.DD_ASSERT(dataPort instanceof nodejsWorker.MessagePort);
			dataPort.once('message', function(msg) {
				root.DD_ASSERT && root.DD_ASSERT(msg.name === 'Parse');
				startParse(msg.options, dataPort);
			});
			dataPort.postMessage({name: 'Ready'});
		};

		startParse = function _startParse(options, dataPort) {
			let clibxml2Cleaned = false,
				allocatedFunctions = null,
				allocatedEntities = null,
				waitMsgs = null,
				waitCb = null,
				endParse = null,
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
				pushParserCtxt = NULL,
				pendingLogs = [],
				pendingNodes = [];

			try {
				root.DD_ASSERT && root.DD_ASSERT(dataPort instanceof nodejsWorker.MessagePort);

				const nodoc = types.get(options, 'nodoc', false),
					discardEntities = types.get(options, 'discardEntities', false),
					entities = types.get(options, 'entities', null),
					xsd = types.get(options, 'xsd', ''),
					encoding = types.get(options, 'encoding', 'utf-8');

				const PTR_LEN = clibxml2._xmlPtrLen();
				const XML_INTERNAL_GENERAL_ENTITY = 1;
				const XML_INTERNAL_PREDEFINED_ENTITY = 6;

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
					error: function _error(ctxPtr, msgPtr, paramsPtr) {
						const strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
						const str = tools.trim(clibxml2.Pointer_stringify(strPtr), '\n');
						if (str) {
							pendingLogs.push({name: 'Log', type: 'Error', message: str});
						};
					},
					warning: function _warning(ctxPtr, msgPtr, paramsPtr) {
						const strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
						const str = tools.trim(clibxml2.Pointer_stringify(strPtr), '\n');
						// FUTURE: See if there is a better way to disable that warning ("Skipping import of schema ...")
						if (str && (str.indexOf("Skipping import of schema") < 0)) {
							pendingLogs.push({name: 'Log', type: 'Warning', message: str});
						};
					},
					//serror: function _serror(userDataPtr, errorPtr) {
					//	pendingLogs.push({name: 'Log', type: 'Error', message: .......});
					//},
					//resolveEntity: function _resolveEntity(ctxPtr, publicIdStrPtr, systemIdStrPtr) {
					//	types.DEBUGGER();
					//},
					getEntity: function _getEntity(ctxPtr, namePtr) {
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
							newNamePtr = createStrPtr(name);
							if (!newNamePtr) {
								throw new types.Error("Failed to allocate string buffer.");
							};
							strPtr = createStrPtr(entity);
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
					externalSubset: function _externalSubset(ctxPtr, namePtr, externalIDPtr, systemIDPtr) {
						const node = {name: 'Node', type: 'DocumentType', args: [/*type*/clibxml2.Pointer_stringify(namePtr)]};
						//node.fileLine = parser.line + 1;
						//node.fileColumn = parser.column + 1;
						pendingNodes.push(node);
					},
					processingInstruction: function _processingInstruction(ctxPtr, targetPtr, dataPtr) {
						const node = {name: 'Node', type: 'ProcessingInstruction', args: [/*name*/clibxml2.Pointer_stringify(targetPtr), /*value*/clibxml2.Pointer_stringify(dataPtr)]};
						//node.fileLine = parser.line + 1;
						//node.fileColumn = parser.column + 1;
						pendingNodes.push(node);
					},
					comment: function _comment(ctxPtr, valuePtr) {
						const node = {name: 'Node', type: 'Comment', args: [/*text*/clibxml2.Pointer_stringify(valuePtr)]};
						//node.fileLine = parser.line + 1;
						//node.fileColumn = parser.column + 1;
						pendingNodes.push(node);
					},
					startElementNs: function _startElementNs(ctxPtr, localnameStrPtr, prefixStrPtr, uriStrPtr, nb_namespaces, namespacesPtrStrPtr, nb_attributes, nb_defaulted, attributesPtrStrPtr) {
						const node = {name: 'Node', type: 'Element', args: [/*name*/clibxml2.Pointer_stringify(localnameStrPtr), /*prefix*/clibxml2.Pointer_stringify(prefixStrPtr), /*baseURI*/clibxml2.Pointer_stringify(uriStrPtr)]};
						pendingNodes.push(node);
						//node.fileLine = parser.line + 1;
						//node.fileColumn = parser.column + 1;
						for (let i = 0; i < nb_attributes; i++) {
							// localname/prefix/URI/value/end
							const ptr = attributesPtrStrPtr + (PTR_LEN * 5 * i);
							const node = {name: 'Node', type: 'Attribute', args: [/*name*/getStrFromXmlCharAr(ptr, 0), /*value*/getStrFromXmlCharAr(ptr, 3, 4), /*prefix*/getStrFromXmlCharAr(ptr, 1), /*baseURI*/getStrFromXmlCharAr(ptr, 2)]};
							//node.fileLine = line + 1;
							//node.fileColumn = column + 1;
							pendingNodes.push(node);
						};
					},
					characters: function _characters(ctxPtr, chPtr, len) {
						const node = {name: 'Node', type: 'Text', args: [/*text*/clibxml2.Pointer_stringify(chPtr, len)]};
						//node.fileLine = parser.line + 1;
						//node.fileColumn = parser.column + 1;
						pendingNodes.push(node);
					},
					cdataBlock: function _cdataBlock(ctxPtr, valuePtr, len) {
						const node = {name: 'Node', type: 'CDATASection', args: [/*data*/clibxml2.Pointer_stringify(valuePtr, len)]};
						//node.fileLine = parser.line + 1;
						//node.fileColumn = parser.column + 1;
						pendingNodes.push(node);
					},
					endElementNs: function _endElementNs(ctxPtr, localnameStrPtr, prefixStrPtr, uriStrPtr) {
						if (!nodoc) {
							const node = {name: 'Node', type: 'EndElement'};
							pendingNodes.push(node);
						};
					},
					//endDocument: function _endDocument(ctxPtr) {
					//	//endParse();
					//},
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

				let stopWaiting; // no-use-before-define

				const wait = function _wait(msgs, callback) {
					if (!waitMsgs) {
						waitMsgs = new tools.nullObject();
					};
					tools.forEach(msgs, function(msg) {
						const cbs = waitMsgs[msg];
						if (cbs) {
							cbs.push(callback);
						} else {
							waitMsgs[msg] = [callback];
						};
					}, this);
					if (!waitCb) {
						waitCb = function(msg) {
							const cbs = types.get(waitMsgs, msg.name);
							if (!cbs) {
								throw new types.Error("Invalid message '~0~'. Expected '~1~'.", [msg.name, tools.keys(waitMsgs).join(',')]);
							};
							delete waitMsgs[msg.name];
							tools.forEach(cbs, function(cb) {
								stopWaiting(null, cb);
								cb(msg);
							});
						};
						dataPort.on('message', waitCb);
					};
				};

				stopWaiting = function _stopWaiting(/*optional*/msgs, /*optional*/callback) {
					if (waitMsgs) {
						if (!msgs && callback) {
							msgs = types.keys(waitMsgs);
						};
						if (msgs) {
							tools.forEach(msgs, function(msg) {
								if (callback) {
									const cbs = tools.filter(waitMsgs[msg], function(cb) {
										return cb !== callback;
									});
									if (cbs.length <= 0) {
										delete waitMsgs[msg];
									};
									waitMsgs[msg] = cbs;
								} else {
									delete waitMsgs[msg];
								};
							});
						} else {
							waitMsgs = null;
						};
					};
					if (waitCb) {
						msgs = types.keys(waitMsgs);
						if (msgs.length <= 0) {
							dataPort.off('message', waitCb);
							waitCb = null;
						};
					};
				};

				let parseChunk; // no-use-before-define

				const waitChunk = function _waitChunk() {
					wait(['Chunk'], function(msg) {
						parseChunk(msg.data);
					});
				};

				const waitNodesAck = function _waitNodesAck(isValid) {
					wait(['Ack'], function(msg) {
						if (isValid) {
							waitChunk();
							dataPort.postMessage({name: 'Ack'});
						} else {
							endParse();
						};
					});
				};

				const parseChunkCleanup = function _parseChunkCleanup() {
					stopWaiting();

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
							unregisterParserData(schemaParserCtxt); // Use userPtrOrg   WHEN POSSIBLE
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
				};

				endParse = function _endParse() {
					parseChunkCleanup();

					listen(dataPort);
				};

				parseChunk = function _parseChunk(chunk) {
					let chunkPtr = NULL;
					try {
						let parseRes = 0;
						if (chunk) {
							root.DD_ASSERT && root.DD_ASSERT(types.isString(chunk) || types.isTypedArray(chunk));
							if (types.isString(chunk)) {
								const len = clibxml2.lengthBytesUTF8(chunk);
								chunkPtr = createStrPtr(chunk, len);
								if (!chunkPtr) {
									throw new types.Error("Failed to allocate string buffer.");
								};
								chunk = null;
								parseRes = clibxml2._xmlParseChunk(pushParserCtxt, chunkPtr, len, 1);
							} else {
								// TODO: Non UTF-8
								chunkPtr = clibxml2.allocate(chunk, 'i8', clibxml2.ALLOC_NORMAL);
								if (!chunkPtr) {
									throw new types.Error("Failed to allocate chunk buffer.");
								};
								parseRes = clibxml2._xmlParseChunk(pushParserCtxt, chunkPtr, chunk.length, 0);
							};
						} else {
							parseRes = clibxml2._xmlParseChunk(pushParserCtxt, NULL, 0, 1);
						};
						let isValid = (parseRes === 0);
						if (isValid && validCtxt) {
							const res = clibxml2._xmlSchemaIsValid(validCtxt);
							isValid = (res > 0);
						};
						waitNodesAck(isValid);
						dataPort.postMessage({name: 'Nodes', nodes: pendingNodes, logs: pendingLogs, isValid, retVal: parseRes});
						pendingNodes = [];
						pendingLogs = [];
					} catch(err) {
						dataPort.postMessage({name: 'Error', type: err.name, message: err.message, stack: err.stack});
						endParse();
					} finally {
						if (chunkPtr) {
							clibxml2._free(chunkPtr);
							chunkPtr = NULL;
						};
					};
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
					urlPtr = createStrPtr(xsd);
					if (!urlPtr) {
						throw new types.Error("Failed to allocate URL string.");
					};
					schemaParserCtxt = clibxml2._xmlSchemaNewParserCtxt(urlPtr /*, userPtr WHEN POSSIBLE. FOR NOW, IT IS EQUAL TO schemaParserCtxt */);
					if (!schemaParserCtxt) {
						throw new types.Error("Failed to create schema parser.");
					};

					registerOptions(schemaParserCtxt, {encoding});

					clibxml2._xmlSchemaSetParserErrors(schemaParserCtxt, allocFunction('error', 'viii'), allocFunction('warning', 'viii'), NULL);

					schema = clibxml2._xmlSchemaParse(schemaParserCtxt);
					if (!schema) {
						throw new types.Error("Failed to parse schema.");
					};

					clibxml2._free(urlPtr); // free memory
					urlPtr = NULL;
					unregisterParserData(schemaParserCtxt); // Use userPtrOrg   WHEN POSSIBLE
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
					if (!sax) {
						throw new types.Error("Unable to retrieve the SAX handler from the SAX plug.");
					};
					userPtr = clibxml2.getValue(userPtrPtr, '*');
					if (!userPtr) {
						throw new types.Error("Unable to retrieve the user context from the SAX plug.");
					};
				};

				pushParserCtxt = clibxml2._xmlCreatePushParserCtxt(sax, userPtr, NULL, 0, NULL);
				if (!pushParserCtxt) {
					throw new types.Error("Failed to create push parser.");
				};

				waitChunk();

				dataPort.postMessage({name: 'Ack'});

			} catch(err) {
				dataPort.postMessage({name: 'Error', type: err.name, message: err.message, stack: err.stack});

				endParse && endParse();

				if (!clibxml2Cleaned && !types._instanceof(err, AbortError)) {
					// Lixml2 is unstable because its cleanup has failed, force abort.
					throw new AbortError(err);
				};

				throw err;
			};
		};

		const matchFuncPtr = clibxml2.addFunction(function _matchFunc(filenameStrPtr) {
			// Force selection of our handlers.
			return 1;
		}, 'ii');

		const openFuncPtr = clibxml2.addFunction(function _openFunc(filenameStrPtr) {
			// Disable file system access
			return NULL;
		}, 'ii');

		const readFuncPtr = clibxml2.addFunction(function _readFunc(inputContextPtr, bufferPtr, bufferLen) {
			// Disable file system access
			return 0;
		}, 'iiii');

		const writeFuncPtr = clibxml2.addFunction(function _writeFunc(inputContextPtr, bufferPtr, bufferLen) {
			// Disable file system access
			return bufferLen;
		}, 'iiii');

		const closeFuncPtr = clibxml2.addFunction(function _closeFunc(inputContextPtr) {
			// Disable file system access
			return 0;
		}, 'ii');

		const externalLoaderPtr = clibxml2.addFunction(function _externalLoader(urlStrPtr, idStrPtr, parserCtxtPtr) {
			// TODO: Read and store base directory from/to "userDataPtr" when "xmlSchemaNewParserCtxt" will accept a "userData" argument.

			const url = files.parseLocation(clibxml2.Pointer_stringify(urlStrPtr));

			let contentPtr = NULL;
			let contentLen = 0;
			//let filenamePtr = NULL;

			try {
				const userDataPtr = clibxml2._xmlGetUserDataFromParserCtxt(parserCtxtPtr);
				if (!userDataPtr) {
					throw new types.Error("The 'libxml2' C library needs some modifications before its build.");
				};

				let content = null;
				const data = getParserData(userDataPtr);
				const encoding = types.get(data.options, 'encoding', null);

				if (url.isRelative) {
					const dirs = data.dirs,
						len = dirs.length;
					for (let i = 0; i < len; i++) {
						const path = dirs[i][1].combine(url/*, {includePathInRoot: false}*/);
						try {
							content = files.readFileSync(path, {encoding});
							registerBaseDirectory(userDataPtr, path);
							break;
						} catch(ex) {
							if (ex.code !== 'ENOENT') {
								throw ex;
							};
						};
					};
				} else {
					content = files.readFileSync(url, {encoding});
					registerBaseDirectory(userDataPtr, url);
				};

				if (!content) {
					// File not found / File empty.
					return NULL;
				};

				if (types.isString(content)) {
					contentLen = clibxml2.lengthBytesUTF8(content);
					contentPtr = createStrPtr(content, contentLen);
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

		clibxml2.onExit = function _onExit(status) {
			tools.abortScript(status);
		};

		clibxml2.onAbort = function _onAbort(what) {
			throw new AbortError(what);
		};

		clibxml2._xmlInitParser();

		// Disable file system access
		clibxml2._xmlCleanupInputCallbacks();
		clibxml2._xmlCleanupOutputCallbacks();
		clibxml2._xmlRegisterInputCallbacks(matchFuncPtr, openFuncPtr, readFuncPtr, closeFuncPtr);
		clibxml2._xmlRegisterOutputCallbacks(matchFuncPtr, openFuncPtr, writeFuncPtr, closeFuncPtr);

		// Set our external loader.
		clibxml2._xmlSetExternalEntityLoader(externalLoaderPtr);

		// Wait for the data port from the main thread.
		nodejsWorker.parentPort.once('message', function(value) {
			listen(value.port);
		});
	});

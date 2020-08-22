// doodad-js - Object-oriented programming framework
// File: xmljs.js - libxml2 JS connector.
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

/* eslint camelcase: "off", id-match: "off" */  // Mixing C and JS

"use strict";

(function(global, module) {

	//===================================
	// Global XML Constants
	//===================================

	const NULL = 0;

	const XML_INTERNAL_GENERAL_ENTITY = 1;
	const XML_INTERNAL_PREDEFINED_ENTITY = 6;

	const ErrorLevelEnum = {
		XML_ERR_NONE: 0,
		XML_ERR_WARNING: 1,
		XML_ERR_ERROR: 2,
		XML_ERR_FATAL: 3,
	};

	const ErrorFieldEnum = {
		XML_SERROR_FIELD_NONE: 0,
		XML_SERROR_FIELD_DOMAIN: 1,
		XML_SERROR_FIELD_CODE: 2,
		XML_SERROR_FIELD_MESSAGE: 3,
		XML_SERROR_FIELD_LEVEL: 4,
		XML_SERROR_FIELD_FILE: 5,
		XML_SERROR_FIELD_LINE: 6,
		XML_SERROR_FIELD_STR1: 7,
		XML_SERROR_FIELD_STR2: 8,
		XML_SERROR_FIELD_STR3: 9,
		XML_SERROR_FIELD_INT1: 10,
		XML_SERROR_FIELD_INT2: 11,
		XML_SERROR_FIELD_CTXT: 12,
		XML_SERROR_FIELD_NODE: 13,
	};

	//=======================
	// Global XML Functions
	//=======================

	const load = function _load(root, genericOutputCb) {
		const doodad = root.Doodad,
			types = doodad.Types,
			tools = doodad.Tools,
			files = tools.Files,
			xml = tools.Xml,
			xmlParsers = xml.Parsers,
			libxml2 = xmlParsers.Libxml2,
			libxml2Loader = libxml2.Loader;

		const clibxml2 = libxml2Loader.get().clibxml2,
			PTR_LEN = clibxml2._xmlPtrLen();

		const allocatedMethods = new types.Map();

		const allocMethod = function _allocMethod(obj, fn, sig) {
			let methods = allocatedMethods.get(obj);
			if (!methods) {
				methods = new types.Map();
				allocatedMethods.set(obj, methods);
			};
			let ptr = methods.get(fn) || NULL;
			if (!ptr && fn) {
				ptr = clibxml2.addFunction(types.bind(obj, fn), sig);
				if (!ptr) {
					throw new types.Error("Failed to allocate function '~0~'.", [fn.name]);
				};
				methods.set(fn, ptr);
			};
			return ptr;
		};

		const deallocMethods = function _deallocMethods(/*optional*/obj, /*optional*/fn) {
			if (obj) {
				const methods = allocatedMethods.get(obj);
				if (methods) {
					if (fn) {
						const ptr = methods.get(fn);
						if (ptr) {
							clibxml2.removeFunction(ptr);
							methods.delete(fn);
						};
					} else {
						tools.forEach(methods, function(ptr, cFn) {
							clibxml2.removeFunction(ptr);
						});
						allocatedMethods.delete(obj);
					};
				};
			} else {
				tools.forEach(allocatedMethods, function(methods, cObj) {
					if (fn) {
						const ptr = methods.get(fn);
						if (ptr) {
							clibxml2.removeFunction(ptr);
							methods.delete(fn);
						};
					} else {
						tools.forEach(methods, function(ptr, cFn) {
							clibxml2.removeFunction(ptr);
						});
					};
				});
				if (!fn) {
					allocatedMethods.clear();
				};
			};
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

		const getStrFromXmlCharAr = function _getStrFromXmlCharAr(ptr, index, /*optional*/end) {
			if (types.isNothing(end)) {
				return clibxml2.Pointer_stringify(clibxml2.getValue(ptr + (PTR_LEN * index), '*'));
			} else {
				const startPtr = clibxml2.getValue(ptr + (PTR_LEN * index), '*');
				const endPtr = clibxml2.getValue(ptr + (PTR_LEN * end), '*');
				return clibxml2.Pointer_stringify(startPtr, endPtr - startPtr);
			};
		};

		//======================
		// Static Classes
		//======================

		const DataRegistry = {
			datas: null,

			init() {
				this.datas = new types.Map();
			},

			registerOptions(schemaParserCtxt, options) {
				if (this.datas.has(schemaParserCtxt)) {
					const data = this.datas.get(schemaParserCtxt);
					data.options = options;
				} else {
					this.datas.set(schemaParserCtxt, {options});
				};
			},

			registerBaseDirectory(schemaParserCtxt, url) {
				const directory = url.set({file: ''});
				const directoryStr = directory.toApiString();
				if (this.datas.has(schemaParserCtxt)) {
					const data = this.datas.get(schemaParserCtxt);
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
					this.datas.set(schemaParserCtxt, {dirs: [[directoryStr, directory]]});
				};
			},

			unregister(schemaParserCtxt) {
				if (!this.datas.has(schemaParserCtxt)) {
					throw new types.Error("Base directory not registered on schema parser '~0~'.", [schemaParserCtxt]);
				};
				this.datas.delete(schemaParserCtxt);
			},

			get(schemaParserCtxt) {
				return this.datas.get(schemaParserCtxt);
			},
		};

		const GenericHandler = {
			errorHandlerPtr: null,
			serrorHandlerPtr: null,

			init(outputCb) {
				this.outputCb = outputCb;

				this.errorHandlerPtr = allocMethod(this, this.errorHandler, 'viii');
				this.serrorHandlerPtr = allocMethod(this, this.serrorHandler, 'vii');

				clibxml2._xmlSetGenericErrorFunc(NULL, this.errorHandlerPtr);
				clibxml2._xmlSetStructuredErrorFunc(NULL, this.serrorHandlerPtr);
			},

			errorHandler(ctxPtr, msgPtr, paramsPtr) {
				let strPtr = NULL;
				try {
					strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
					const str = tools.trim(clibxml2.Pointer_stringify(strPtr), '\n');
					if (str) {
						this.outputCb({name: 'Log', type: 'Error', message: str});
					};
				} finally {
					if (strPtr !== NULL) {
						clibxml2._xmlFreeEx(strPtr);
						strPtr = NULL;
					};
				};
			},

			serrorHandler(userDataPtr, errorPtr) {
				const level = clibxml2._xmlGetStructuredErrorField_Int(errorPtr, ErrorFieldEnum.XML_SERROR_FIELD_LEVEL);
				if (level) {
					const msgPtr = clibxml2._xmlGetStructuredErrorField_Str(errorPtr, ErrorFieldEnum.XML_SERROR_FIELD_MESSAGE);
					const msg = tools.trim(clibxml2.Pointer_stringify(msgPtr), '\n');
					if (msg) {
						if ((level !== ErrorLevelEnum.XML_ERR_WARNING) || (msg.indexOf("Skipping import of schema") < 0)) {
							this.outputCb({name: 'Log', type: ((level === ErrorLevelEnum.XML_ERR_WARNING) ? 'Warning' : 'Error'), message: msg});
						};
					};
				};
			},

			//destroy() {
			//	// TODO: Reset handlers
			//	//clibxml2._xmlSetGenericErrorFunc(NULL, ???);
			//	//clibxml2._xmlSetStructuredErrorFunc(NULL, ???);
			//
			//	deallocMethods(this, null);
			//},
		};

		const ExternalLoaderHandler = {
			matchHandlerPtr: null,
			openHandlerPtr: null,
			readHandlerPtr: null,
			writeHandlerPtr: null,
			closeHandlerPtr: null,
			loaderHandlerPtr: null,

			init() {
				this.matchHandlerPtr = allocMethod(this, this.matchHandler, 'ii');
				this.openHandlerPtr = allocMethod(this, this.openHandler, 'ii');
				this.readHandlerPtr = allocMethod(this, this.readHandler, 'iiii');
				this.writeHandlerPtr = allocMethod(this, this.writeHandler, 'iiii');
				this.closeHandlerPtr = allocMethod(this, this.closeHandler, 'ii');
				this.loaderHandlerPtr = allocMethod(this, this.loaderHandler, 'iiii');

				// Disable file system access
				clibxml2._xmlCleanupInputCallbacks();
				clibxml2._xmlCleanupOutputCallbacks();
				clibxml2._xmlRegisterInputCallbacks(this.matchHandlerPtr, this.openHandlerPtr, this.readHandlerPtr, this.closeHandlerPtr);
				clibxml2._xmlRegisterOutputCallbacks(this.matchHandlerPtr, this.openHandlerPtr, this.writeHandlerPtr, this.closeHandlerPtr);

				// Set the loader
				clibxml2._xmlSetExternalEntityLoader(this.loaderHandlerPtr);
			},

			matchHandler(filenameStrPtr) {
				// Force selection of our handlers.
				return 1;
			},

			openHandler(filenameStrPtr) {
				// Disable file system access
				return NULL;
			},

			readHandler(inputContextPtr, bufferPtr, bufferLen) {
				// Disable file system access
				return 0;
			},

			writeHandler(inputContextPtr, bufferPtr, bufferLen) {
				// Disable file system access
				return bufferLen;
			},

			closeHandler(inputContextPtr) {
				// Disable file system access
				return 0;
			},

			loaderHandler(urlStrPtr, idStrPtr, parserCtxtPtr) {
				// TODO: Read and store base directory from/to "userDataPtr" when "xmlSchemaNewParserCtxt" will accept a "userData" argument.

				const urlStr = clibxml2.Pointer_stringify(urlStrPtr);
				if (!urlStr) {
					return NULL;
				};

				const url = files.parseLocation(urlStr);

				let contentPtr = NULL;
				//let filenamePtr = NULL;

				try {
					const userDataPtr = clibxml2._xmlGetUserDataFromParserCtxt(parserCtxtPtr);
					if (!userDataPtr) {
						throw new types.Error("The 'libxml2' C library needs some modifications before its build.");
					};

					const data = DataRegistry.get(userDataPtr);
					const encoding = types.get(data.options, 'encoding', null);

					let content = null;
					if (url.isRelative) {
						const dirs = data.dirs,
							len = dirs.length;
						for (let i = 0; i < len; i++) {
							const path = dirs[i][1].combine(url/*, {includePathInRoot: false}*/);
							try {
								content = files.readFileSync(path, {encoding});
								DataRegistry.registerBaseDirectory(userDataPtr, path);
								break;
							} catch(ex) {
								if (ex.code !== 'ENOENT') {
									throw ex;
								};
							};
						};
					} else {
						content = files.readFileSync(url, {encoding});
						DataRegistry.registerBaseDirectory(userDataPtr, url);
					};

					if (!content) {
						// File not found / File empty.
						return NULL;
					};

					let contentLen = 0;
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
			},

			//destroy() {
			//	// TODO: Reset handlers
			//	clibxml2._xmlCleanupInputCallbacks();
			//	clibxml2._xmlCleanupOutputCallbacks();
			//	//clibxml2._xmlSetExternalEntityLoader(????);
			//
			//	deallocMethods(this, null);
			//},
		};

		//=================
		// Classes
		//=================

		const SaxHandler = {
			init() {
				this.allocatedEntities = null;

				this.internalSubsetHandlerPtr = NULL; //allocMethod(this, this.internalSubsetHandler, 'viiii');
				this.isStandaloneHandlerPtr = NULL; //allocMethod(this, this.isStandaloneHandler, 'ii');
				this.hasInternalSubsetHandlerPtr = NULL; //allocMethod(this, this.hasInternalSubsetHandler, 'ii');
				this.hasExternalSubsetHandlerPtr = NULL; //allocMethod(this, this.hasExternalSubsetHandler, 'ii');
				this.resolveEntityHandlerPtr = NULL; //allocMethod(this, this.resolveEntityHandler, 'iiii');
				this.getEntityHandlerPtr = allocMethod(this, this.getEntityHandler, 'iii');
				this.entityDeclHandlerPtr = NULL; //allocMethod(this, this.entityDeclHandler, 'viiiiii');
				this.notationDeclHandlerPtr = NULL; //allocMethod(this, this.notationDeclHandler, 'viiii');
				this.attributeDeclHandlerPtr = NULL; //allocMethod(this, this.attributeDeclHandler, 'viiiiiii');
				this.elementDeclHandlerPtr = NULL; //allocMethod(this, this.elementDeclHandler, 'viiii');
				this.unparsedEntityDeclHandlerPtr = NULL; //allocMethod(this, this.unparsedEntityDeclHandler, 'viiiii');
				this.setDocumentLocatorHandlerPtr = NULL; //allocMethod(this, this.setDocumentLocatorHandler, 'vii');
				this.startDocumentHandlerPtr = NULL; //allocMethod(this, this.startDocumentHandler, 'vi');
				this.endDocumentHandlerPtr = NULL; //allocMethod(this, this.endDocumentHandler, 'vi');
				this.startElementHandlerPtr = NULL; //allocMethod(this, this.startElementHandler, 'viii');
				this.endElementHandlerPtr = NULL; //allocMethod(this, this.endElementHandler, 'vii');
				this.referenceHandlerPtr = NULL; //allocMethod(this, this.referenceHandler, 'vii');
				this.charactersHandlerPtr = allocMethod(this, this.charactersHandler, 'viii');
				this.ignorableWhitespaceHandlerPtr = NULL; //allocMethod(this, this.ignorableWhitespaceHandler, 'viii');
				this.processingInstructionHandlerPtr = allocMethod(this, this.processingInstructionHandler, 'viii');
				this.commentHandlerPtr = allocMethod(this, this.commentHandler, 'vii');
				this.warningHandlerPtr = allocMethod(this, this.warningHandler, 'viii');
				this.errorHandlerPtr = allocMethod(this, this.errorHandler, 'viii');
				this.fatalErrorHandlerPtr = allocMethod(this, this.fatalErrorHandler, 'viii');
				this.getParameterEntityHandlerPtr = NULL; //allocMethod(this, this.getParameterEntityHandler, 'iii');
				this.cdataBlockHandlerPtr = allocMethod(this, this.cdataBlockHandler, 'viii');
				this.externalSubsetHandlerPtr = allocMethod(this, this.externalSubsetHandler, 'viiii');
				this.startElementNsHandlerPtr = allocMethod(this, this.startElementNsHandler, 'viiiiiiiii');
				this.endElementNsHandlerPtr = allocMethod(this, this.endElementNsHandler, 'viiii');
				this.serrorHandlerPtr = allocMethod(this, this.serrorHandler, 'vii');

				this.saxPtr = clibxml2._xmlCreateMySAXHandler(
					this.internalSubsetHandlerPtr,
					this.isStandaloneHandlerPtr,
					this.hasInternalSubsetHandlerPtr,
					this.hasExternalSubsetHandlerPtr,
					this.resolveEntityHandlerPtr,
					this.getEntityHandlerPtr,
					this.entityDeclHandlerPtr,
					this.notationDeclHandlerPtr,
					this.attributeDeclHandlerPtr,
					this.elementDeclHandlerPtr,
					this.unparsedEntityDeclHandlerPtr,
					this.setDocumentLocatorHandlerPtr,
					this.startDocumentHandlerPtr,
					this.endDocumentHandlerPtr,
					this.startElementHandlerPtr,
					this.endElementHandlerPtr,
					this.referenceHandlerPtr,
					this.charactersHandlerPtr,
					this.ignorableWhitespaceHandlerPtr,
					this.processingInstructionHandlerPtr,
					this.commentHandlerPtr,
					this.warningHandlerPtr,
					this.errorHandlerPtr,
					this.fatalErrorHandlerPtr,
					this.getParameterEntityHandlerPtr,
					this.cdataBlockHandlerPtr,
					this.externalSubsetHandlerPtr,
					this.startElementNsHandlerPtr,
					this.endElementNsHandlerPtr,
					this.serrorHandlerPtr
				);

				if (!this.saxPtr) {
					throw new types.Error("Failed to create SAXHandler.");
				};
			},

			warningHandler(ctxPtr, msgPtr, paramsPtr) {
				let strPtr = NULL;
				try {
					strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
					const str = tools.trim(clibxml2.Pointer_stringify(strPtr), '\n');
					// FUTURE: See if there is a better way to disable that warning ("Skipping import of schema ...")
					if (str && (str.indexOf("Skipping import of schema") < 0)) {
						const { options } = DataRegistry.get(ctxPtr);
						const outputCb = types.get(options, 'outputCb', null);
						outputCb({name: 'Log', type: 'Warning', message: str});
					};
				} finally {
					if (strPtr !== NULL) {
						clibxml2._xmlFreeEx(strPtr);
						strPtr = NULL;
					};
				};
			},

			errorHandler(ctxPtr, msgPtr, paramsPtr) {
				let strPtr = NULL;
				try {
					strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
					const str = tools.trim(clibxml2.Pointer_stringify(strPtr), '\n');
					if (str) {
						const { options } = DataRegistry.get(ctxPtr);
						const outputCb = types.get(options, 'outputCb', null);
						outputCb({name: 'Log', type: 'Error', message: str});
					};
				} finally {
					if (strPtr !== NULL) {
						clibxml2._xmlFreeEx(strPtr);
						strPtr = NULL;
					};
				};
			},

			fatalErrorHandler(ctxPtr, msgPtr, paramsPtr) {
				let strPtr = NULL;
				try {
					strPtr = clibxml2._xmlFormatGenericError(ctxPtr, msgPtr, paramsPtr);
					const str = tools.trim(clibxml2.Pointer_stringify(strPtr), '\n');
					if (str) {
						const { options } = DataRegistry.get(ctxPtr);
						const outputCb = types.get(options, 'outputCb', null);
						outputCb({name: 'Log', type: 'Error', message: str});
					};
				} finally {
					if (strPtr !== NULL) {
						clibxml2._xmlFreeEx(strPtr);
						strPtr = NULL;
					};
				};
			},

			serrorHandler(userDataPtr, errorPtr) {
				const level = clibxml2._xmlGetStructuredErrorField_Int(errorPtr, ErrorFieldEnum.XML_SERROR_FIELD_LEVEL);
				if (level) {
					const msgPtr = clibxml2._xmlGetStructuredErrorField_Str(errorPtr, ErrorFieldEnum.XML_SERROR_FIELD_MESSAGE);
					const msg = tools.trim(clibxml2.Pointer_stringify(msgPtr), '\n');
					if (msg) {
						if ((level !== ErrorLevelEnum.XML_ERR_WARNING) || (msg.indexOf("Skipping import of schema") < 0)) {
							const { options } = DataRegistry.get(userDataPtr);
							const outputCb = types.get(options, 'outputCb', null);
							outputCb({name: 'Log', type: ((level === ErrorLevelEnum.XML_ERR_WARNING) ? 'Warning' : 'Error'), message: msg});
						};
					};
				};
			},

			//resolveEntityHandler(ctxPtr, publicIdStrPtr, systemIdStrPtr) {
			//},

			getEntityHandler(ctxPtr, namePtr) {
				const name = clibxml2.Pointer_stringify(namePtr);
				if (name === '__proto__') {
					return NULL;
				};
				const { options } = DataRegistry.get(ctxPtr);
				const entities = types.get(options, 'entities', null),
					discardEntities = types.get(options, 'discardEntities', false);
				const entity = types.get(entities, name);
				if (!entity) {
					return NULL;
				};
				if (!this.allocatedEntities) {
					this.allocatedEntities = new types.Map();
				};
				const ptr = this.allocatedEntities.get(name);
				if (ptr) {
					return ptr;
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
					this.allocatedEntities.set(name, entityPtr);
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

			externalSubsetHandler(ctxPtr, namePtr, externalIDPtr, systemIDPtr) {
				const { options } = DataRegistry.get(ctxPtr);
				const outputCb = types.get(options, 'outputCb', null);
				const node = {name: 'Node', type: 'DocumentType', docType: clibxml2.Pointer_stringify(namePtr)};
				//node.fileLine = parser.line + 1;
				//node.fileColumn = parser.column + 1;
				outputCb(node);
			},

			processingInstructionHandler(ctxPtr, targetPtr, dataPtr) {
				const { options } = DataRegistry.get(ctxPtr);
				const outputCb = types.get(options, 'outputCb', null);
				const node = {name: 'Node', type: 'ProcessingInstruction', instruction: clibxml2.Pointer_stringify(targetPtr), value: clibxml2.Pointer_stringify(dataPtr)};
				//node.fileLine = parser.line + 1;
				//node.fileColumn = parser.column + 1;
				outputCb(node);
			},

			commentHandler(ctxPtr, valuePtr) {
				const { options } = DataRegistry.get(ctxPtr);
				const outputCb = types.get(options, 'outputCb', null);
				const node = {name: 'Node', type: 'Comment', comment: clibxml2.Pointer_stringify(valuePtr)};
				//node.fileLine = parser.line + 1;
				//node.fileColumn = parser.column + 1;
				outputCb(node);
			},

			startElementNsHandler(ctxPtr, localnameStrPtr, prefixStrPtr, uriStrPtr, nb_namespaces, namespacesPtrStrPtr, nb_attributes, nb_defaulted, attributesPtrStrPtr) {
				const { options } = DataRegistry.get(ctxPtr);
				const outputCb = types.get(options, 'outputCb', null);
				const node = {name: 'Node', type: 'Element', tag: clibxml2.Pointer_stringify(localnameStrPtr), prefix: clibxml2.Pointer_stringify(prefixStrPtr), uri: clibxml2.Pointer_stringify(uriStrPtr)};
				//node.fileLine = parser.line + 1;
				//node.fileColumn = parser.column + 1;
				outputCb(node);
				for (let i = 0; i < nb_attributes; i++) {
					// localname/prefix/URI/value/end
					const ptr = attributesPtrStrPtr + (PTR_LEN * 5 * i);
					const node = {name: 'Node', type: 'Attribute', key: getStrFromXmlCharAr(ptr, 0), value: getStrFromXmlCharAr(ptr, 3, 4), prefix: getStrFromXmlCharAr(ptr, 1), uri: getStrFromXmlCharAr(ptr, 2)};
					//node.fileLine = line + 1;
					//node.fileColumn = column + 1;
					outputCb(node);
				};
			},

			charactersHandler(ctxPtr, chPtr, len) {
				const { options } = DataRegistry.get(ctxPtr);
				const outputCb = types.get(options, 'outputCb', null);
				const node = {name: 'Node', type: 'Text', text: clibxml2.Pointer_stringify(chPtr, len)};
				//node.fileLine = parser.line + 1;
				//node.fileColumn = parser.column + 1;
				outputCb(node);
			},

			cdataBlockHandler(ctxPtr, valuePtr, len) {
				const { options } = DataRegistry.get(ctxPtr);
				const outputCb = types.get(options, 'outputCb', null);
				const node = {name: 'Node', type: 'CDATASection', data: clibxml2.Pointer_stringify(valuePtr, len)};
				//node.fileLine = parser.line + 1;
				//node.fileColumn = parser.column + 1;
				outputCb(node);
			},

			endElementNsHandler(ctxPtr, localnameStrPtr, prefixStrPtr, uriStrPtr) {
				const { options } = DataRegistry.get(ctxPtr);
				const nodoc = types.get(options, 'nodoc', false),
					outputCb = types.get(options, 'outputCb', null);
				if (!nodoc) {
					const node = {name: 'Node', type: 'EndElement'};
					outputCb(node);
				};
			},

			//endDocumentHandler(ctxPtr) {
			//}

			destroy() {
				if (this.allocatedEntities) {
					tools.forEach(this.allocatedEntities, function(entityPtr, name) {
						clibxml2._xmlFreeEntity(entityPtr);
					});
					this.allocatedEntities = null;
				};

				if (this.saxPtr) {
					clibxml2._xmlFreeMySAXHandler(this.saxPtr);
					this.saxPtr = NULL;
				};

				deallocMethods(this, null);
			},
		};

		class Parser {
			constructor(options) {
				this.options = options;

				this.ended = false;
				this.allocatedMethods = null;
				this.waitMsgs = null;
				this.waitCb = null;
				this.saxPtrPtr = NULL;
				this.userPtr = NULL;
				this.userPtrOrg = NULL;
				this.userPtrPtr = NULL;
				this.urlPtr = NULL;
				this.schemaParserCtxt = NULL;
				this.schema = NULL;
				this.validCtxt = NULL;
				this.saxPlug = NULL;
				this.pushParserCtxt = NULL;

				//const nodoc = types.get(options, 'nodoc', false),
				//	discardEntities = types.get(options, 'discardEntities', false),
				//	entities = types.get(options, 'entities', null),
				//	encoding = types.get(options, 'encoding', 'utf-8'),
				const xsd = types.get(options, 'xsd', '');

				this.saxPtr = SaxHandler.saxPtr;

				this.userPtr = clibxml2._malloc(PTR_LEN);
				if (!this.userPtr) {
					throw new types.Error("Failed to create user context.");
				};
				this.userPtrOrg = this.userPtr;
				clibxml2.setValue(this.userPtr, 0, 'i32');

				DataRegistry.registerOptions(this.userPtr, options);

				if (xsd) {
					this.urlPtr = createStrPtr(xsd);
					if (!this.urlPtr) {
						throw new types.Error("Failed to allocate URL string.");
					};
					this.schemaParserCtxt = clibxml2._xmlSchemaNewParserCtxt(this.urlPtr /*, this.userPtr WHEN POSSIBLE. FOR NOW, IT IS EQUAL TO this.schemaParserCtxt */);
					if (!this.schemaParserCtxt) {
						throw new types.Error("Failed to create schema parser.");
					};

					DataRegistry.registerOptions(this.schemaParserCtxt, options);

					clibxml2._xmlSchemaSetParserErrors(this.schemaParserCtxt, SaxHandler.errorHandlerPtr, SaxHandler.warningHandlerPtr, this.userPtr);
					clibxml2._xmlSchemaSetParserStructuredErrors(this.schemaParserCtxt, SaxHandler.serrorHandlerPtr, this.userPtr);

					this.schema = clibxml2._xmlSchemaParse(this.schemaParserCtxt);
					if (!this.schema) {
						throw new types.Error("Failed to parse schema.");
					};

					clibxml2._free(this.urlPtr); // free memory
					this.urlPtr = NULL;
					DataRegistry.unregister(this.schemaParserCtxt); // Use this.userPtrOrg   WHEN POSSIBLE
					clibxml2._xmlSchemaFreeParserCtxt(this.schemaParserCtxt);
					this.schemaParserCtxt = NULL;

					this.validCtxt = clibxml2._xmlSchemaNewValidCtxt(this.schema);
					if (!this.validCtxt) {
						throw new types.Error("Failed to create schema validator.");
					};

					clibxml2._xmlSchemaSetValidErrors(this.validCtxt, SaxHandler.errorHandlerPtr, SaxHandler.warningHandlerPtr, this.userPtr);
					clibxml2._xmlSchemaSetValidStructuredErrors(this.validCtxt, SaxHandler.serrorHandlerPtr, this.userPtr);

					this.saxPtrPtr = clibxml2._malloc(PTR_LEN);
					if (!this.saxPtrPtr) {
						throw new types.Error("Failed to create SAX pointer.");
					};
					clibxml2.setValue(this.saxPtrPtr, this.saxPtr, '*');
					this.userPtrPtr = clibxml2._malloc(PTR_LEN);
					if (!this.userPtrPtr) {
						throw new types.Error("Failed to create user context pointer.");
					};
					clibxml2.setValue(this.userPtrPtr, this.userPtr, '*');
					this.saxPlug = clibxml2._xmlSchemaSAXPlug(this.validCtxt, /*ref*/this.saxPtrPtr, /*ref*/this.userPtrPtr);
					if (!this.saxPlug) {
						throw new types.Error("Failed to plug schema with SAX.");
					};
					this.saxPtr = clibxml2.getValue(this.saxPtrPtr, '*');
					if (!this.saxPtr) {
						throw new types.Error("Unable to retrieve the SAX handler from the SAX plug.");
					};
					this.userPtr = clibxml2.getValue(this.userPtrPtr, '*');
					if (!this.userPtr) {
						throw new types.Error("Unable to retrieve the user context from the SAX plug.");
					};
				};

				this.pushParserCtxt = clibxml2._xmlCreatePushParserCtxt(this.saxPtr, this.userPtr, NULL, 0, NULL);
				if (!this.pushParserCtxt) {
					throw new types.Error("Failed to create push parser.");
				};
			}

			destroy() {
				if (this.pushParserCtxt) {
					clibxml2._xmlFreeParserCtxt(this.pushParserCtxt);
					this.pushParserCtxt = NULL;
				};

				if (this.saxPlug) {
					clibxml2._xmlSchemaSAXUnplug(this.saxPlug);
					this.saxPlug = NULL;
					//this.saxPtr = NULL;  <PRB> Code commented because "this.saxPtr" returned from "xmlSchemaSAXPlug" is not freed by "xmlSchemaSAXUnplug".
					this.userPtr = NULL; // OK
				};

				if (this.validCtxt) {
					clibxml2._xmlSchemaFreeValidCtxt(this.validCtxt);
					this.validCtxt = NULL;
				};

				if (this.schema) {
					clibxml2._xmlSchemaFree(this.schema);
					this.schema = NULL;
				};

				if (this.schemaParserCtxt) {
					DataRegistry.unregister(this.schemaParserCtxt); // Use this.userPtrOrg   WHEN POSSIBLE
					clibxml2._xmlSchemaFreeParserCtxt(this.schemaParserCtxt);
					this.schemaParserCtxt = NULL;
				};

				if (this.urlPtr) {
					clibxml2._free(this.urlPtr);
					this.urlPtr = NULL;
				};

				deallocMethods(this, null);

				if (this.saxPtrPtr) {
					clibxml2._free(this.saxPtrPtr);
					this.saxPtrPtr = NULL;
				};

				if (this.saxPtr && (this.saxPtr !== SaxHandler.saxPtr)) {
					clibxml2._xmlFreeEx(this.saxPtr);
					this.saxPtr = NULL;
				};

				if (this.userPtrPtr) {
					clibxml2._free(this.userPtrPtr);
					this.userPtrPtr = NULL;
				};

				if (this.userPtr && (this.userPtr !== this.userPtrOrg)) {
					clibxml2._xmlFreeEx(this.userPtr);
					this.userPtr = NULL;
				};

				if (this.userPtrOrg) {
					DataRegistry.unregister(this.userPtrOrg);
					clibxml2._free(this.userPtrOrg);
					this.userPtrOrg = NULL;
				};
			}

			__parseInternal(chunkPtr, len) {
				const parseRes = clibxml2._xmlParseChunk(this.pushParserCtxt, chunkPtr, len, (this.ended ? 1 : 0));
				let isValid = (parseRes === 0);
				if (isValid && this.validCtxt) {
					const res = clibxml2._xmlSchemaIsValid(this.validCtxt);
					isValid = (res > 0);
				};
				const outputCb = types.get(this.options, 'outputCb', null);
				outputCb({name: 'Result', isValid, retVal: parseRes, ended: this.ended});
			}

			parse(chunk) {
				if (this.ended) {
					throw new types.NotAvailable("Parse has been ended.");
				};
				let chunkPtr = NULL;
				try {
					if (chunk) {
						root.DD_ASSERT && root.DD_ASSERT(types.isString(chunk) || types.isTypedArray(chunk));
						let len = 0;
						if (types.isString(chunk)) {
							len = clibxml2.lengthBytesUTF8(chunk);
							chunkPtr = createStrPtr(chunk, len);
						} else {
							// TODO: Non UTF-8
							len = chunk.length;
							chunkPtr = clibxml2.allocate(chunk, 'i8', clibxml2.ALLOC_NORMAL);
						};
						if (!chunkPtr) {
							throw new types.Error("Failed to allocate chunk buffer.");
						};
						chunk = null;  // free memory
						this.__parseInternal(chunkPtr, len);
					};
				} finally {
					if (chunkPtr) {
						clibxml2._free(chunkPtr);
						chunkPtr = NULL;
					};
				};
			}

			end() {
				if (!this.ended) {
					this.ended = true;
					this.__parseInternal(NULL, 0);
				};
			}
		};

		//=================
		// Init
		//=================

		// Init C library
		clibxml2.onExit = function _onExit(status) {
			tools.abortScript(status);
		};
		clibxml2.onAbort = function _onAbort(what) {
			throw new libxml2.AbortError(what);
		};
		clibxml2._xmlInitParser();

		// Init data registry.
		DataRegistry.init();

		// Init generic handlers.
		GenericHandler.init(genericOutputCb);

		// Init external loader.
		ExternalLoaderHandler.init();

		// Init SAX
		SaxHandler.init();

		//=================
		// Exports
		//=================

		return {
			Parser,
		};
	};

	//====================
	// Exports
	//====================

	const exports = {
		load,
	};

	if (module) {
		module.exports = exports;
	} else {
		global.xmljs = exports;
	};

})((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this), ((typeof module !== 'undefined') && (typeof process !== 'undefined') ? module : null));

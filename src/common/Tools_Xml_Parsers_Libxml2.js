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
				//files = tools.Files,
				xml = tools.Xml,
				xmlParsers = xml.Parsers,
				libxml2 = xmlParsers.Libxml2,
				libxml2Loader = libxml2.Loader;

			//===================================
			// Internal
			//===================================

			const __Internal__ = {
				initialized: false,

				xmljsParser: null,

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
			// Classes
			//===================================

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

			//=========================
			// Libxml2 (single thread)
			//=========================

			__Internal__.genericOutputCb = function genericOutputCb(msg) {
				if (msg.name === 'Log') {
					tools.log((msg.type === 'Warning') ? tools.LogLevels.Warning : tools.LogLevels.Error, msg.message);
				};
			};

			__Internal__.initClibxml2 = function initClibxml2(initOpts) {
				const Promise = types.getPromise();
				return Promise.try(function initClibxml2Promise() {
					const libs = libxml2Loader.get();

					__Internal__.xmljsParser = libs.xmljs.load(root, __Internal__.genericOutputCb).Parser;

					__Internal__.initialized = true;
				});
			};

			__Internal__.parseWithClibxml2 = function parseWithClibxml2(stream, options) {
				const Promise = types.getPromise();

				let parser = null;

				return Promise.create(function parseWithClibxml2Promise(resolve, reject) {
					if (!__Internal__.xmljsParser) {
						throw new types.NotAvailable("The 'libxml2' parser is not available.");
					};

					const nodoc = types.get(options, 'nodoc', false),
						discardEntities = types.get(options, 'discardEntities', false),
						entities = types.get(options, 'entities', null),
						//xsd = types.get(options, 'xsd', null),
						//encoding = types.get(options, 'encoding', null),
						callback = types.get(options, 'callback', null);

					const doc = (nodoc ? null : new xml.Document());

					if (!nodoc && !discardEntities) {
						const nodes = doc.getEntities();
						tools.forEach(entities, function(value, name) {
							const node = new xml.Entity(name, value);
							nodes.append(node);
						});
					};

					let currentNode = doc;

					const outputCb = function _outputCb(msg) {
						if (msg.name === 'Log') {
							tools.log((msg.type === 'Warning') ? tools.LogLevels.Warning : tools.LogLevels.Error, msg.message);

						} else if (msg.name === 'Node') {
							if (msg.type === 'DocumentType') {
								const node = new xml.DocumentType(msg.docType);
								//node.fileLine = parser.line + 1;
								//node.fileColumn = parser.column + 1;
								if (nodoc) {
									callback(node);
								} else {
									doc.setDocumentType(node);
								};

							} else if (msg.type === 'ProcessingInstruction') {
								const node = new xml.ProcessingInstruction(msg.instruction, msg.value);
								//node.fileLine = parser.line + 1;
								//node.fileColumn = parser.column + 1;
								if (nodoc) {
									callback(node);
								} else {
									doc.getInstructions().append(node);
								};

							} else if (msg.type === 'Comment') {
								const node = new xml.Comment(msg.comment);
								//node.fileLine = parser.line + 1;
								//node.fileColumn = parser.column + 1;
								if (nodoc) {
									callback(node);
								} else {
									currentNode.getChildren().append(node);
								};

							} else if (msg.type === 'Element') {
								const node = new xml.Element(msg.tag, msg.prefix, msg.uri);
								//node.fileLine = parser.line + 1;
								//node.fileColumn = parser.column + 1;
								if (nodoc) {
									callback(node);
								} else {
									currentNode.getChildren().append(node);
									currentNode = node;
								};

							} else if (msg.type === 'Attribute') {
								const attrs = (nodoc ? null : currentNode.getAttrs());
								const node = new xml.Attribute(msg.key, msg.value, msg.prefix, msg.uri);
								//node.fileLine = line + 1;
								//node.fileColumn = column + 1;
								if (nodoc) {
									callback(node);
								} else {
									attrs.append(node);
								};

							} else if (msg.type === 'Text') {
								const node = new xml.Text(msg.text);
								//node.fileLine = parser.line + 1;
								//node.fileColumn = parser.column + 1;
								if (nodoc) {
									callback(node);
								} else {
									currentNode.getChildren().append(node);
								};

							} else if (msg.type === 'CDATASection') {
								const node = new xml.CDATASection(msg.data);
								//node.fileLine = parser.line + 1;
								//node.fileColumn = parser.column + 1;
								if (nodoc) {
									callback(node);
								} else {
									currentNode.getChildren().append(node);
								};

							} else if (msg.type === 'EndElement') {
								if (!nodoc) {
									currentNode = currentNode.getParent();
								};

							} else {
								// Missing Node type.
								types.DEBUGGER();

							};

						} else if (msg.name === 'Result') {
							if (!msg.isValid) {
								if (msg.retVal === 0) {
									throw new types.ParseError("Invalid XML document (based on the schema).");
								} else {
									throw new types.ParseError("Invalid XML document: '~0~'.", [libxml2.getParserMessage(msg.retVal)]);
								};
							};

							if (msg.ended) {
								if (nodoc) {
									callback(null);
								};

								resolve(doc);

								if (!types.isString(stream)) {
									stream.stopListening();
								};
							};

						} else {
							// Missing message handler.
							types.DEBUGGER();

						};
					};

					parser = new __Internal__.xmljsParser(options, outputCb);

					if (types.isString(stream)) {
						parser.parse(stream);
						parser.end();
					} else {
						stream.onError.attachOnce(null, function(ev) {
							ev.preventDefault();
							reject(ev.error);
						});
						stream.onReady.attach(null, function(ev) {
							ev.preventDefault();
							if (ev.data.raw === io.EOF) {
								parser.end();
							} else {
								const value = ev.data.valueOf();
								parser.parse(value);
							};
						});
						stream.listen();
					};
				})
					.nodeify(function(err, result) {
						try {
							types.DESTROY(parser);
						} catch(ex) {
							// Emscripten is now unstable !
							throw new libxml2.AbortError("'xmljs' parser cleanup failed.");
						};

						if (err) {
							throw err;
						};

						return result;
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
						return worker;
					};

					errorCb = function _errorCb(ev) {
						shutdown();
						reject(ev.detail);
					};

					readyCb = function _readyCb(ev) {
						ready++;
						ev.detail.worker.addEventListener('terminate', terminateCb);
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
						if (!types.DESTROYED(worker)) {
							worker.removeEventListener('error', errorCb);
							worker.removeEventListener('log', logCb);
							worker.removeEventListener('finish', finishCb);
							worker.removeEventListener('terminate', terminateCb);
						};
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
						if (!types.isString(xsd)) {
							if (types.isNothing(xsd)) {
								xsd = '';
							} else {
								xsd = types.toString(xsd);
							};
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

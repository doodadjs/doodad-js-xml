//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
	// doodad-js - Object-oriented programming framework
	// File: Tools_Xml_Parsers_Libxml2_Loader.js - Loader for the libxml2 parser (server-side with NodeJS)
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
	//! INJECT("import {default as nodejsWorker} from 'worker_threads';")

//! ELSE()
	"use strict";

	let nodejsWorker = null;
	try {
		/* eslint global-require: "off" */
		nodejsWorker = require('worker_threads'); // optional
	} catch(ex) {
		// Do nothing
	};
//! END_IF()

exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.Tools.Xml.Parsers.Libxml2.Loader'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.Tools.Xml',
			'Doodad.IO',
			{
				name: 'Doodad.Tools.Xml.Parsers.Libxml2.Errors',
				optional: true,
			},
		],

		create: function create(root, /*optional*/_options, _shared) {
			//===================================
			// Get namespaces
			//===================================

			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				files = tools.Files,
				modules = doodad.Modules,
				io = doodad.IO,
				ioMixIns = io.MixIns,
				xml = tools.Xml,
				xmlParsers = xml.Parsers,
				libxml2 = xmlParsers.Libxml2,
				libxml2Loader = libxml2.Loader;

			//===================================
			// Natives
			//===================================

			tools.complete(_shared.Natives, {
				mathMin: global.Math.min,
			});

			//===================================
			// Internal
			//===================================

			// <FUTURE> Thread context
			const __Internal__ = {
				clibxml2: null,
				xmljs: null,

				workerPath: files.parsePath(__dirname).combine(root.getOptions().fromSource ? './Tools_Xml_Parsers_Libxml2_Worker.js' : './Tools_Xml_Parsers_Libxml2_Worker.min.js').toApiString(),
			};


			// NOTE: Experimental (08/21/2018)
			// NOTE: That's difficult to expect real threads from the JS guys :)

			libxml2Loader.REGISTER(types.Error.$inherit(
				/*typeProto*/
				{
					$TYPE_NAME: 'WorkerError',
					$TYPE_UUID: /*! REPLACE_BY(TO_SOURCE(UUID('Libxml2AbortError')), true) */ null /*! END_REPLACE() */,

					[types.ConstructorSymbol](type, message, stack) {
						this.innerName = type;
						this.innerStack = stack;
						return ["XML Worker error: ~0~.", [message]];
					}
				},
				/*instanceProto*/
				{
					innerName: null,
					innerStack: null,
				}));

			libxml2Loader.REGISTER(types.CustomEventTarget.$inherit(
				/*typeProto*/
				{
					$TYPE_NAME: 'WorkerWrapper',

					$isAvailable: function $isAvailable() {
						return !!nodejsWorker;
					},
				},
				/*instanceProto*/
				{
					number: -1,

					started: false,
					available: false,
					worker: null,
					channel: null,

					parseOptions: null,
					document: null,
					currentNode: null,
					stream: null,

					waitMsgs: null,
					waitCb: null,

					onready: null,
					onerror: null,
					onlog: null,
					onfinish: null,
					onterminate: null,

					_new: types.SUPER(function _new(number) {
						const type = types.getType(this);
						if (!type.$isAvailable()) {
							throw new types.NotAvailable("'~0~' is not available.", [types.getTypeName(type)]);
						};

						this._super();

						this.number = number;

						this.start();
					}),

					_delete: types.SUPER(function _super() {
						this.close();

						this._super();
					}),

					handleError: function handleError(err) {
						this.dispatchEvent(new types.CustomEvent('error', {detail: err}));
						this.stopWaiting();
						tools.callAsync(this.close, 0, this);
					},

					start: function start() {
						root.DD_ASSERT && root.DD_ASSERT(!this.started);

						this.started = true;

						const startupOpts = root.getOptions();

						this.worker = new nodejsWorker.Worker(__Internal__.workerPath, {stdout: true, stderr: true, workerData: {number: this.number, startupOpts}});

						//const cleanup = function _cleanup() {
						//	this.worker.removeListener('...', ...);
						//};

						this.worker.on('error', doodad.Callback(this, this.handleError));

						this.worker.on('exit', doodad.Callback(this, function(exitCode) {
							this.dispatchEvent(new types.CustomEvent('terminate', {detail: {exitCode, number: this.number}}));
							this.close();
						}));

						this.worker.on('message', doodad.Callback(this, function(msg) {
							if (msg.name === 'Error') {
								const err = new libxml2Loader.WorkerError(msg.type, msg.message, msg.stack);
								this.handleError(err);
							} else if (msg.name === 'Log') {
								const ev = new types.CustomEvent('log', {detail: {type: msg.type, message: msg.message}});
								this.dispatchEvent(ev);
							} else {
								throw new types.Error("Unexpected message received from the worker.");
							};
						}));

						this.worker.once('online', doodad.Callback(this, function() {
							this.channel = new nodejsWorker.MessageChannel();

							this.wait(['Error'], doodad.Callback(this, function(msg) {
								const err = new libxml2Loader.WorkerError(msg.type, msg.message, msg.stack);
								this.handleError(err);
							}));

							/* ???? "close" gets always raised
							const onCloseCb = doodad.Callback(this, function() {
								this.close();
							});
							this.channel.port1.on('close', onCloseCb);
							this.channel.port2.on('close', onCloseCb);
							*/

							this.waitReady();

							this.worker.postMessage({port: this.channel.port1}, [this.channel.port1]);
						}, this.handleError));
					},

					close: function close() {
						this.started = false;
						this.available = false;

						this.stopWaiting();

						//const channel = this.channel;

						//const terminateCb = doodad.Callback(this, function() {
						//	if (channel) {
						//		channel.port1.close();
						//		channel.port2.close();
						//	};
						//});

						if (this.worker) {
							//this.worker.terminate(terminateCb);
							this.worker.terminate();
							this.worker = null;
							this.channel = null;
						};
						//} else {
						//	terminateCb();
						//};

						this.currentNode = null;
						this.document = null;
						this.parseOptions = null;
					},

					wait: function wait(msgs, callback) {
						if (!this.waitMsgs) {
							this.waitMsgs = new tools.nullObject();
						};
						tools.forEach(msgs, function(msg) {
							const cbs = this.waitMsgs[msg];
							if (cbs) {
								cbs.push(callback);
							} else {
								this.waitMsgs[msg] = [callback];
							};
						}, this);
						if (!this.waitCb) {
							this.waitCb = doodad.Callback(this, function(msg) {
								const cbs = types.get(this.waitMsgs, msg.name);
								if (!cbs) {
									throw new types.Error("Invalid message '~0~'. Expected '~1~'.", [msg.name, types.keys(this.waitMsgs).join(',')]);
								};
								delete this.waitMsgs[msg.name];
								tools.forEach(cbs, function(cb) {
									this.stopWaiting(null, cb);
									cb(msg);
								}, this);
							}, this.handleError);
							this.channel.port2.on('message', this.waitCb);
						};
					},

					stopWaiting: function stopWaiting(/*optional*/msgs, /*optional*/callback) {
						if (this.waitMsgs) {
							if (!msgs && callback) {
								msgs = types.keys(this.waitMsgs);
							};
							if (msgs) {
								tools.forEach(msgs, function(msg) {
									if (callback) {
										const cbs = tools.filter(this.waitMsgs[msg], function(cb) {
											return cb !== callback;
										});
										if (cbs.length <= 0) {
											delete this.waitMsgs[msg];
										};
										this.waitMsgs[msg] = cbs;
									} else {
										delete this.waitMsgs[msg];
									};
								}, this);
							} else {
								this.waitMsgs = null;
							};
						};
						if (this.waitCb) {
							msgs = types.keys(this.waitMsgs);
							if (msgs.length <= 0) {
								this.channel.port2.removeListener('message', this.waitCb);
								this.waitCb = null;
							};
						};
					},

					waitReady: function waitReady() {
						this.stopWaiting('Ready');
						this.wait(['Ready'], doodad.Callback(this, function() {
							this.started = true;
							this.available = true;
							this.dispatchEvent(new types.CustomEvent('ready', {detail: {worker: this}}));
						}, this.handleError));
					},

					sendChunk: function sendChunk(chunk, end) {
						this.channel.port2.postMessage({name: 'Chunk', data: chunk, end: !!end});
					},

					waitResult: function waitResult(nodeCb, doneCb) {
						this.wait(['Result'], doodad.Callback(this, function(msg) {
							tools.forEach(msg.logs, function(msg) {
								root.DD_ASSERT && root.DD_ASSERT(msg.name === 'Log');

								this.dispatchEvent(new types.CustomEvent('log', {detail: {type: msg.type, message: msg.message}}));
							}, this);

							tools.forEach(msg.nodes, function(msg) {
								root.DD_ASSERT && root.DD_ASSERT(msg.name === 'Node');

								if (msg.type === 'DocumentType') {
									const node = new xml.DocumentType(msg.docType);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.document.setDocumentType(node);
									};
								} else if (msg.type === 'ProcessingInstruction') {
									const node = new xml.ProcessingInstruction(msg.instruction, msg.value);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.document.getInstructions().append(node);
									};
								} else if (msg.type === 'Comment') {
									const node = new xml.Comment(msg.comment);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.currentNode.getChildren().append(node);
									};
								} else if (msg.type === 'Element') {
									const node = new xml.Element(msg.tag, msg.prefix, msg.uri);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.currentNode.getChildren().append(node);
										this.currentNode = node;
									};
								} else if (msg.type === 'Attribute') {
									const node = new xml.Attribute(msg.key, msg.value, msg.prefix, msg.uri);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.currentNode.getAttrs().append(node);
									};
								} else if (msg.type === 'Text') {
									const node = new xml.Text(msg.text);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.currentNode.getChildren().append(node);
									};
								} else if (msg.type === 'CDATASection') {
									const node = new xml.CDATASection(msg.data);
									if (nodeCb) {
										nodeCb(node);
									} else {
										this.currentNode.getChildren().append(node);
									};
								} else if (msg.type === 'EndElement') {
									if (!nodeCb) {
										this.currentNode = this.currentNode.getParent();
									};
								} else {
									throw new types.ValueError("Invalid XML node type '~0~'.", [msg.type]);
								};
							}, this);

							if (!msg.isValid) {
								if (msg.retVal === 0) {
									throw new types.ParseError("Invalid XML document (based on the schema).");
								} else {
									throw new types.ParseError("Invalid XML document: '~0~'.", [libxml2.getParserMessage(msg.retVal)]);
								};
							};

							if (msg.ended) {
								this.endParse();
							};

							//this.channel.port2.postMessage({name: 'Ack'});

							doneCb && doneCb();
						}, this.handleError));
					},

					waitParseAckHandler: function waitParseAckHandler() {
						const nodoc = types.get(this.parseOptions, 'nodoc', false),
							discardEntities = types.get(this.parseOptions, 'discardEntities', false),
							entities = types.get(this.parseOptions, 'entities', null),
							//xsd = types.get(this.parseOptions, 'xsd', ''),
							//encoding = types.get(this.parseOptions, 'encoding', null),
							callback = (nodoc ? types.get(this.parseOptions, 'callback', null) : null);

						this.document = (nodoc ? null : new xml.Document());

						if (!nodoc && !discardEntities) {
							const nodes = this.document.getEntities();
							tools.forEach(entities, function(value, name) {
								const node = new xml.Entity(name, value);
								nodes.append(node);
							});
						};

						this.currentNode = this.document;

						if (types.isString(this.stream)) {
							this.waitResult(callback, null);
							this.sendChunk(this.stream, true);
						} else {
							this.stream.onError.attachOnce(this, function(ev) {
								ev.preventDefault();
								this.handleError(ev.error);
							});
							this.stream.onReady.attach(this, function(ev) {
								ev.preventDefault();
								const end = (ev.data.raw === io.EOF);
								const chunk = ev.data.valueOf();
								const deferredCb = ev.data.defer();
								this.waitResult(callback, deferredCb);
								this.sendChunk(chunk, end);
							});
							this.stream.listen();
						};

						this.stream = null; // free memory
					},

					endParse: function endParse() {
						this.started = false;

						this.stopWaiting();
						this.waitReady();
						this.dispatchEvent(new types.CustomEvent('finish', {detail: this.document}));

						this.stream = null;
						this.currentNode = null;
						this.document = null;
						this.parseOptions = null;
					},

					parse: function parse(stream, /*optional*/options) {
						const nodoc = types.get(options, 'nodoc', false),
							discardEntities = types.get(options, 'discardEntities', false),
							entities = types.get(options, 'entities', null),
							xsd = types.get(options, 'xsd', ''),
							encoding = types.get(options, 'encoding', null),
							callback = (nodoc ? types.get(options, 'callback', null) : null);

						if (!this.available) {
							throw types.NotAvailable("The worker thread is not available.");
						};

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types._implements(stream, ioMixIns.TextInput) || types.isString(stream), "Invalid stream.");
							root.DD_ASSERT(types.isNothing(xsd) || types.isString(xsd), "Invalid 'xsd' option.");
						};

						this.available = false;
						this.stream = stream;
						this.parseOptions = {nodoc, discardEntities, entities, xsd, encoding, callback};

						this.wait(['AckParse'], doodad.Callback(this, this.waitParseAckHandler, this.handleError), true);

						this.channel.port2.postMessage({name: 'Parse', options: {nodoc, discardEntities, entities, xsd, encoding}});
					},
				}
			));

			//===================================
			// libxml2 Parser
			//===================================

			// NOTE: libxml2 is optional
			libxml2Loader.ADD('get', root.DD_DOC(
				//! REPLACE_IF(IS_UNSET('debug'), "null")
					{
						author: "Claude Petit",
						revision: 2,
						params: null,
						returns: 'object',
						description: "Returns parser from the libxml2 library when available. Otherwise, returns 'null'.",
					}
				//! END_REPLACE()
				, function get() {
					if (!__Internal__.clibxml2 || !__Internal__.xmljs) {
						return null;
					};

					return {
						clibxml2: __Internal__.clibxml2,
						xmljs: __Internal__.xmljs,
					};
				}));

			libxml2Loader.ADD('isAvailable', function isAvailable() {
				return !!(__Internal__.clibxml2 && __Internal__.xmljs);
			});

			libxml2Loader.ADD('hasFeatures', function hasFeatures(features) {
				if (!__Internal__.clibxml2 || !__Internal__.xmljs) {
					return false;
				};

				const current = {
					// <PRB> libxml2 schema files loader is not Asynchronous so we have to use Workers (when available) or be running on debug mode.
					schemas: !!(libxml2Loader.WorkerWrapper.$isAvailable() || root.getOptions().debug),

					// NOTE: Messages are loaded separatly
					messages: !!(libxml2.Errors && types.isFunction(libxml2.Errors.getParserMessage)),
				};

				return tools.every(features, function(wanted, name) {
					return !wanted || types.get(current, name, false);
				});
			});

			//===================================
			// Init
			//===================================
			return function init(/*optional*/options) {
				//const Promise = types.getPromise();

				// <PRB> Emscripten calls "process.exit" on "unhandledRejection" !!!
				const unhandledListeners = process.listeners('unhandledRejection');
				const handledListeners = process.listeners('rejectionHandled');

				// Start all imports
				return modules.loadFiles([{module: '@doodad-js/xml', path: 'lib/libxml2/libxml2.min.js'}, {module: '@doodad-js/xml', path: 'lib/libxml2/xmljs.js'}])
					.then(function(files) {
						// <PRB> Emscripten calls "process.exit" on "unhandledRejection" !!!
						process.listeners('unhandledRejection').forEach(function(listener) {
							if (tools.indexOf(unhandledListeners, listener) < 0) {
								process.removeListener('unhandledRejection', listener);
							};
						});
						process.listeners('rejectionHandled').forEach(function(listener) {
							if (tools.indexOf(handledListeners, listener) < 0) {
								process.removeListener('rejectionHandled', listener);
							};
						});

						__Internal__.clibxml2 = files[0].exports.default;
						__Internal__.xmljs = files[1].exports.default;
					});
			};
		},
	};
	return modules;
};

//! END_MODULE()

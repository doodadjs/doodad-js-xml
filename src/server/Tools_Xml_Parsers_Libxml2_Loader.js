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

//! ELSE()
	"use strict";

//! END_IF()

exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.Tools.Xml.Parsers.Libxml2.Loader'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.Tools.Xml',
			'Doodad.IO',
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
				nodejsWorker: null,
				clibxml2: null,

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
						return ["XML Worker error '~0~'.", [message]];
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
						return !!__Internal__.nodejsWorker;
					},
				},
				/*instanceProto*/
				{
					number: -1,

					started: false,
					available: false,
					worker: null,
					channel: null,

					currentNode: null,

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

					start: function start() {
						try {
							root.DD_ASSERT && root.DD_ASSERT(!this.started);

							this.started = true;

							this.worker = new __Internal__.nodejsWorker.Worker(__Internal__.workerPath, {stdout: true, stderr: true, workerData: {number: this.number, startupOpts: root.getOptions()}});

							this.worker.on('error', doodad.Callback(this, function(err) {
								this.dispatchEvent(new types.CustomEvent('error', {detail: err}));
								this.close();
							}));

							this.worker.on('exit', doodad.Callback(this, function(exitCode) {
								this.dispatchEvent(new types.CustomEvent('terminate', {detail: {exitCode, number: this.number}}));
								this.close();
							}));

							this.worker.on('online', doodad.Callback(this, function() {
								this.channel = new __Internal__.nodejsWorker.MessageChannel();

								this.wait(['Error'], doodad.Callback(this, function(value) {
									const err = new libxml2Loader.WorkerError(value.type, value.message, value.stack);
									this.dispatchEvent(new types.CustomEvent('error', {detail: err}));
									this.close();
								}));

								//this.waitLog();

								/* ???? "close" gets always raised
								const onCloseCb = doodad.Callback(this, function() {
									this.close();
									this.worker.terminate();
								});
								this.channel.port1.on('close', onCloseCb);
								this.channel.port2.on('close', onCloseCb);
								*/

								this.waitReady();

								this.worker.postMessage({port: this.channel.port1}, [this.channel.port1]);
							}));
						} catch(err) {
							this.dispatchEvent(new types.CustomEvent('error', {detail: err}));
							this.close();
							throw err;
						};
					},

					close: function close() {
						if (this.started) {
							this.started = false;
							this.available = false;

							this.stopWaiting();

							if (this.channel) {
								this.channel.port1.close();
								this.channel.port2.close();
								this.channel = null;
							};

							if (this.worker) {
								this.worker.terminate();
								this.worker = null;
							};
						};
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
							});
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
								this.channel.port2.off('message', this.waitCb);
								this.waitCb = null;
							};
						};
					},

					//waitLog: function waitLog() {
					//	this.stopWaiting('Log');
					//	this.wait(['Log'], doodad.Callback(this, function(value) {
					//		this.dispatchEvent(new types.CustomEvent('log', {detail: value}));
					//		this.waitLog();
					//	}));
					//},

					waitReady: function waitReady() {
						this.stopWaiting('Ready');
						this.wait(['Ready'], doodad.Callback(this, function() {
							this.started = true;
							this.available = true;
							this.dispatchEvent(new types.CustomEvent('ready'));
						}));
					},

					sendChunk: function sendChunk(chunk) {
						this.channel.port2.postMessage({name: 'Chunk', data: chunk});
					},

					parse: function parse(stream, /*optional*/options) {
						const nodoc = types.get(options, 'nodoc', false),
							discardEntities = types.get(options, 'discardEntities', false),
							entities = types.get(options, 'entities', null),
							xsd = types.get(options, 'xsd', null),
							callback = types.get(options, 'callback', null);

						try {
							if (!this.available) {
								throw types.NotAvailable("The worker thread is not available.");
							};

							// TODO: MemoryStream to replace strings
							root.DD_ASSERT && root.DD_ASSERT(types._implements(stream, ioMixIns.TextInput) || types.isString(stream), "Invalid stream.");

							const xsdStr = (xsd ? xsd.toApiString() : '');

							this.available = false;

							this.wait(['Ack'], doodad.Callback(this, function() {
								const doc = (nodoc ? null : new xml.Document());
								let attrs = null;

								if (!nodoc && !discardEntities) {
									tools.forEach(entities, function(value, name) {
										const node = new xml.Entity(name, value);
										doc.getEntities().append(node);
									});
								};

								this.currentNode = doc;

								const waitNodes = function _waitNodes() {
									this.wait(['Nodes'], doodad.Callback(this, function(msg) {
										tools.forEach(msg.logs, function(msg) {
											this.dispatchEvent(new types.CustomEvent('log', {detail: {type: msg.type, message: msg.message}}));
										}, this);
										tools.forEach(msg.nodes, function(msgNode) {
											root.DD_ASSERT && root.DD_ASSERT(msgNode.name === 'Node');
											if (msgNode.type === 'EndElement') {
												this.currentNode = this.currentNode.getParent();
											} else {
												const type = xml[msgNode.type];
												if (!types.baseof(xml.Node, type)) {
													throw new types.ValueError("Invalid XML node type '~0~'.", [msgNode.type]);
												};
												const args = msgNode.args || [];
												if (!types.isArray(args)) {
													throw new types.ValueError("Invalid XML node type arguments.");
												};
												const node = new type(...args);
												if (nodoc) {
													callback && callback(node);
												} else {
													if (types._instanceof(node, xml.ProcessingInstruction)) {
														doc.getInstructions().append(node);
													} else if (types._instanceof(node, xml.DocumentType)) {
														doc.setDocumentType(node);
													} else if (types._instanceof(node, xml.Element)) {
														this.currentNode.getChildren().append(node);
														this.currentNode = node;
														attrs = this.currentNode.getAttrs();
													} else if (types._instanceof(node, xml.Attribute)) {
														attrs.append(node);
													} else {
														this.currentNode.getChildren().append(node);
													};
												};
											};
										}, this);
										this.channel.port2.postMessage({name: 'Ack'});
										if (!msg.isValid) {
											throw new types.ParseError("Invalid XML document.");
										};
									}));
								};

								waitNodes.call(this);

								if (types.isString(stream)) {
									this.wait(['Ack'], doodad.Callback(this, function() {
										this.wait(['Ack'], doodad.Callback(this, function() {
											this.stopWaiting();
											this.waitReady();
											this.dispatchEvent(new types.CustomEvent('finish', {detail: doc}));
										}));
										waitNodes.call(this);
										this.sendChunk(null);
									}));
									this.sendChunk(stream);
								} else {
									stream.onError.attachOnce(this, function(ev) {
										ev.preventDefault();
										this.dispatchEvent(new types.CustomEvent('error', {detail: ev.error}));
										this.close();
									});
									stream.onReady.attach(this, function(ev) {
										ev.preventDefault();
										try {
											const deferredCb = ev.data.defer();
											if (ev.data.raw === io.EOF) {
												this.wait(['Ack'], doodad.Callback(this, function() {
													this.stopWaiting();
													this.waitReady();
													this.dispatchEvent(new types.CustomEvent('finish', {detail: doc}));
													deferredCb();
												}));
												this.sendChunk(null);
											} else {
												const chunk = ev.data.valueOf();
												// console.log(io.TextData.$decode(chunk, 'utf-8'))
												this.wait(['Ack'], doodad.Callback(this, function() {
													waitNodes.call(this);
													deferredCb();
												}));
												this.sendChunk(chunk);
											};
										} catch(err) {
											this.dispatchEvent(new types.CustomEvent('error', {detail: err}));
											this.close();
										};
									});
									stream.listen();
								};
							}), true);

							this.channel.port2.postMessage({name: 'Parse', options: {nodoc, discardEntities, entities, xsd: xsdStr}});

						} catch(err) {
							this.dispatchEvent(new types.CustomEvent('error', {detail: err}));
							this.close();
						};
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
						revision: 1,
						params: null,
						returns: 'object',
						description: "Returns parser from the libxml2 library when available. Otherwise, returns 'null'.",
					}
				//! END_REPLACE()
				, function get() {
					return __Internal__.clibxml2;
				}));

			libxml2Loader.ADD('isAvailable', function isAvailable() {
				return !!__Internal__.clibxml2;
			});

			libxml2Loader.ADD('hasFeatures', function hasFeatures(features) {
				if (!__Internal__.clibxml2) {
					return false;
				};

				// <PRB> libxml2 schema files loader is not Asynchronous so we have to use Workers (when available) or be running on debug mode.
				const current = {
					schemas: libxml2Loader.WorkerWrapper.$isAvailable() || root.getOptions().debug,
				};

				return tools.every(features, function(wanted, name) {
					return !wanted || types.get(current, name, false);
				});
			});

			//===================================
			// Init
			//===================================
			return function init(/*optional*/options) {
				let unhandledListeners,
					handledListeners;
				return modules.import('worker_threads')
					.nodeify(function(err, exports) {
						if (!err) {
							// Optional
							__Internal__.nodejsWorker = exports.default;
						};

						// <PRB> Emscripten calls "process.exit" on "unhandledRejection" !!!
						unhandledListeners = process.listeners('unhandledRejection');
						handledListeners = process.listeners('rejectionHandled');

						return modules.import('@doodad-js/xml/lib/libxml2/libxml2.min.js');
					})
					.then(function(exports) {
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

						__Internal__.clibxml2 = exports.default;
					});
			};
		},
	};
	return modules;
};

//! END_MODULE()

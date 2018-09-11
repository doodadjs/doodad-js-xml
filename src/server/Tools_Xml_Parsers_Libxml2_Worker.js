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

/* import {default as nodejsAssert} from 'assert'; */
/* import {default as nodejsWorker} from 'worker_threads'; */
/* import {default as doodadjs} from '@doodad-js/core'; */

"use strict";

/* eslint import/no-unresolved: "off" */  // Module "worker_threads" is available behind a flag

const nodejsAssert = require('assert'),
	nodejsWorker = require('worker_threads');

nodejsAssert.strictEqual(nodejsWorker.isMainThread, false, "That script is dedicated to a Node.js Worker thread.");

const doodadjs = require('@doodad-js/core');

// Workflow: [out]Ready ==> [in]Parse(options) ==> [out]AckParse ==> [in]Chunk(data) ==> [out]Result ==> [in]Chunk(data) ==> [out]Result ==> [in]Chunk(end: true) ==> [out]Result(ended: true) ==> [out]Ready

doodadjs.createRoot(null, {node_env: (nodejsWorker.workerData.startupOpts.debug ? 'dev' : null)})
	.then(function thenLoadModules(root) {
		return root.Doodad.Modules.load([{module: '@doodad-js/xml'}], {"Doodad.Tools.Xml.Parsers.Libxml2": {workersCount: 0}});
	})
	.thenCreate(function thenRun(root, resolve, reject) {
		//===================================
		// Namespaces
		//===================================

		const doodad = root.Doodad,
			types = doodad.Types,
			tools = doodad.Tools,
			xml = tools.Xml,
			xmlParsers = xml.Parsers,
			libxml2 = xmlParsers.Libxml2,
			libxml2Loader = libxml2.Loader;

		tools.trapUnhandledErrors();

		const genericOutputCb = function _genericOutputCb(msg) {
			nodejsWorker.parentPort.postMessage(msg);
		};

		const libs = libxml2Loader.get(),
			xmljsParser = libs.xmljs.load(root, genericOutputCb).Parser;

		const Worker = {
			dataPort: null,
			options: null,

			waitMsgs: null,
			waitHandlerCb: null,

			parser: null,

			logs: null,
			nodes: null,

			init() {
				// Wait for the data port from the main thread.
				nodejsWorker.parentPort.once('message', doodad.Callback(this, function onMessageInitHandler(msg) {
					root.DD_ASSERT && root.DD_ASSERT(msg.port instanceof nodejsWorker.MessagePort);

					this.dataPort = msg.port;

					this.listen();
				}));
			},

			startParse(options) {
				const xsd = types.get(options, 'xsd', '');

				if (root.DD_ASSERT) {
					root.DD_ASSERT(types.isString(xsd), "Invalid 'xsd' option.");
				};

				this.options = options;

				this.stopWaiting();

				this.reset();

				const outputCb = doodad.Callback(this, this.outputHandler);
				this.parser = new xmljsParser(tools.extend({}, options, {outputCb}));

				this.waitChunk();

				this.dataPort.postMessage({name: 'AckParse'});
			},

			outputHandler(msg) {
				if (msg.name === 'Log') {
					if (!this.logs) {
						this.logs = [];
					};

					this.logs.push(msg);

				} else if (msg.name === 'Node') {
					if (!this.nodes) {
						this.nodes = [];
					};

					this.nodes.push(msg);

				} else if (msg.name === 'Result') {
					this.dataPort.postMessage(tools.extend({}, msg, {nodes: this.nodes, logs: this.logs}));

					this.reset();

					if (msg.ended) {
						this.endParse();
					};

				} else {
					this.dataPort.postMessage(msg);

				};
			},

			reset() {
				this.logs = null;
				this.nodes = null;
			},

			stopWaiting(/*optional*/msgs, /*optional*/callback) {
				if (this.waitMsgs) {
					if (!msgs && callback) {
						msgs = types.keys(this.waitMsgs);
					};

					if (msgs) {
						tools.forEach(msgs, function forEachMsg(msg) {
							if (callback) {
								const cbs = tools.filter(this.waitMsgs[msg], function filterMsgs(cb) {
									return cb !== callback;
								});
								if (cbs.length <= 0) {
									delete this.waitMsgs[msg];
								};
								this.waitMsgs[msg] = cbs;
							} else {
								delete this.waitMsgs[msg];
							};
						});
					} else {
						this.waitMsgs = null;
					};
				};

				if (this.waitHandlerCb) {
					msgs = types.keys(this.waitMsgs);

					if (msgs.length <= 0) {
						this.dataPort.removeListener('message', this.waitHandlerCb);
						this.waitHandlerCb = null;
					};
				};
			},

			waitHandler(msg) {
				const cbs = types.get(this.waitMsgs, msg.name);

				if (!cbs) {
					throw new types.Error("Invalid message '~0~'. Expected '~1~'.", [msg.name, types.keys(this.waitMsgs).join(',')]);
				};

				delete this.waitMsgs[msg.name];

				tools.forEach(cbs, function forEachCb(cb) {
					this.stopWaiting(null, cb);
					cb(msg);
				}, this);
			},

			wait(msgs, callback) {
				if (!this.waitMsgs) {
					this.waitMsgs = new tools.nullObject();
				};

				tools.forEach(msgs, function forEachMsg(msg) {
					const cbs = this.waitMsgs[msg];
					if (cbs) {
						cbs.push(callback);
					} else {
						this.waitMsgs[msg] = [callback];
					};
				}, this);

				if (!this.waitHandlerCb) {
					this.waitHandlerCb = doodad.Callback(this, this.waitHandler);
					this.dataPort.on('message', this.waitHandlerCb);
				};
			},

			endParse() {
				this.stopWaiting();

				if (this.parser) {
					this.parser.destroy();
					this.parser = null;
				};

				this.options = null;

				this.listen();
			},

			parseChunk(chunk, end) {
				if (!end) {
					this.waitChunk();
				};

				if (chunk) {
					this.parser.parse(chunk);
				};

				if (end) {
					this.parser.end();
				};
			},

			waitChunk() {
				this.wait(['Chunk'], doodad.Callback(this, function chunkHandler(msg) {
					this.parseChunk(msg.data, msg.end);
				}));
			},

			listen() {
				this.dataPort.once('message', doodad.Callback(this, function onMessageHandler(msg) {
					if (msg.name === 'Parse') {
						this.startParse(msg.options);
					} else {
						throw new types.Error("Unexpected received message '~0~'.", [msg.name]);
					};
				}));

				this.dataPort.postMessage({name: 'Ready'});
			},
		};

		return Worker.init();
	})
	.catch(function catchError(err) {
		nodejsWorker.parentPort.postMessage({name: 'Error', type: err.name, message: err.message, stack: err.stack});
	});

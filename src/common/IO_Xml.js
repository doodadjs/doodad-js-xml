//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under WTFPL\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Xml.js - JSON Parser
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
		DD_MODULES['Doodad.IO.Xml'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			dependencies: [
				'Doodad.Tools.Xml', 
				'Doodad.Tools.Xml.Parsers.Sax.Loader',
			],
			
			create: function create(root, /*optional*/_options, _shared) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================
					
				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					xml = tools.Xml,
					xmlParsers = xml.Parsers,
					saxLoader = xmlParsers.Sax.Loader,
					io = doodad.IO,
					ioXml = io.Xml;
					
					
				//===================================
				// Internal
				//===================================
					
				//// <FUTURE> Thread context
				//const __Internal__ = {
				//};
					
				//types.complete(_shared.Natives, {
				//});

				
				// TODO: Test me
				ioXml.REGISTER(io.Stream.$extend(
									io.TextInputStream,
									io.TextOutputStream,
				{
					$TYPE_NAME: 'Stream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Stream')), true) */,

					__listening: doodad.PROTECTED(false),
					__xmlParser: doodad.PROTECTED(null),
					__xmlAttributes: doodad.PROTECTED(null), // <PRB> 'onattribute' is called before 'onopentag' !
					__xmlLevel: doodad.PROTECTED(0),

					$Modes: doodad.PUBLIC(doodad.TYPE({
						Text: 0,
						CData: 1,
						Element: 2,
						Attribute: 3,
						DocumentType: 4,
						ProcessingInstruction: 5,
						Comment: 6,
					})),
					
					//create: doodad.OVERRIDE(function create(/*optional*/options) {
					//	this._super(options);
					//}),
					
					reset: doodad.OVERRIDE(function reset() {
						const sax = saxLoader.getSAX();
						const parser = sax.parser(true, types.extend({}, this.options, {xmlns: true, position: true}));
						const type = types.getType(this);
						
						const entities = types.get(this.options, 'entities', null);
						if (entities) {
							parser.ENTITIES = entities;
						} else {
							// NOTE: We reduce default entities only once when they are loaded.
							parser.ENTITIES = xml.getEntities();
						};
						
						//	tools.forEach(parser.ENTITIES, function(value, name) {
						//		const node = new xml.Entity(name, value);
						//		this.push(node, {output: false});
						//	});
						
						// TODO: Combine extracted datas from a chunk of 15K (Node.js's default) to a single "push" call in an Array so that we don't need a buffer size of 100000 !

						parser.onerror = doodad.Callback(this, function onerror(err) {
							this.onError(new doodad.ErrorEvent(err));
						}, true);
						
						// TODO: onopentext, onclosetext
						parser.ontext = doodad.Callback(this, function ontext(text) {
							let node;

							this.__xmlLevel++;
							// TODO: Transform
							node = {
								mode: type.$Modes.Text,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							// TODO: Transform
							node = {
								mode: type.$Modes.Text,
								value: text,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								level: this.__xmlLevel,
								valueOf: function() {return this.raw;},
								Modes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							this.__xmlLevel--;
							// TODO: Transform
							node = {
								mode: type.$Modes.Text,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);

						// TODO: onopenscript, onclosescript
						parser.onscript = doodad.Callback(this, function onscript(script) {
							this.__xmlLevel++;

							let node;

							// TODO: Transform
							node = {
								mode: type.$Modes.CData,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							// TODO: Transform
							node = {
								mode: type.$Modes.CData,
								value: script,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							this.__xmlLevel--;
							// TODO: Transform
							node = {
								mode: type.$Modes.CData,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						parser.onopentag = doodad.Callback(this, function onopentag(tag) {
							const name = tag.local,
								prefix = tag.prefix || null,
								uri = tag.uri || null;
								
							this.__xmlLevel++;
							
							let node;

							// TODO: Transform
							node = {
								mode: type.$Modes.Element,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							// TODO: Transform
							node = {
								mode: type.$Modes.Element,
								name: name,
								prefix: prefix,
								uri: uri,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							// <PRB> 'onattribute' is called before 'onopentag' !
							for (let i = 0; i < this.__xmlAttributes.length; i++) {
								const attrDef = this.__xmlAttributes[i],
									attr = attrDef[0],
									line = attrDef[1],
									column = attrDef[2];
								const name = attr.local,
									prefix = attr.prefix || null,
									uri = attr.uri || null;
								node = {
									mode: type.$Modes.Attribute,
									name: name,
									value: attr.value,
									prefix: prefix,
									uri: uri,
									level: this.__xmlLevel,
									fileLine: line + 1,
									fileColumn: column + 1,
									valueOf: function() {return this.raw;},
									NodeTypes: type.$Modes,
								};
								node.raw = node;
								this.push(node);
							};
							
							this.__xmlAttributes.length = 0;
						}, true);
						
						parser.onclosetag = doodad.Callback(this, function onclosetag(tagName) {
							this.__xmlLevel--;

							let node;

							// TODO: Transform
							node = {
								mode: type.$Modes.CloseElement,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						parser.onattribute = doodad.Callback(this, function onattribute(attr) {
							// <PRB> 'onattribute' is called before 'onopentag' !
							this.__xmlAttributes.push([attr, this.__xmlParser.line, this.__xmlParser.column]);
						}, true);
						
						parser.ondoctype = doodad.Callback(this, function ondoctype(doctype) {
							let node;

							// TODO: Transform
							node = {
								mode: type.$Modes.DocumentType,
								value: doctype,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						parser.onprocessinginstruction = doodad.Callback(this, function onprocessinginstruction(instr) {
							let node;

							// TODO: Transform
							node = {
								mode: type.$Modes.ProcessingInstruction,
								name: instr.name,
								value: instr.body,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						// TODO: onopencomment, onclosecomment
						parser.oncomment = doodad.Callback(this, function oncomment(comment) {
							let node;

							this.__xmlLevel++;
							// TODO: Transform
							node = {
								mode: type.$Modes.OpenComment,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							// TODO: Transform
							node = {
								mode: type.$Modes.Comment,
								value: comment,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
							
							this.__xmlLevel--;
							// TODO: Transform
							node = {
								mode: type.$Modes.CloseComment,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						parser.onopencdata = doodad.Callback(this, function onopencdata() {
							let node;

							this.__xmlLevel++;
							// TODO: Transform
							node = {
								mode: type.$Modes.OpenCData,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);

						parser.oncdata = doodad.Callback(this, function oncdata(cdata) {
							let node;

							// TODO: Transform
							node = {
								mode: type.$Modes.CData,
								value: cdata,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						parser.onclosecdata = doodad.Callback(this, function onclosecdata() {
							let node;

							this.__xmlLevel--;

							// TODO: Transform
							node = {
								mode: type.$Modes.CloseCData,
								isOpenClose: true,
								level: this.__xmlLevel,
								fileLine: this.__xmlParser.line + 1,
								fileColumn: this.__xmlParser.column + 1,
								valueOf: function() {return this.raw;},
								NodeTypes: type.$Modes,
							};
							node.raw = node;
							this.push(node);
						}, true);
						
						parser.onend = doodad.Callback(this, function onend() {
							const dta = this.transform({raw: io.EOF});
							this.push(dta);
						}, true);

						this.__xmlParser = parser;
						this.__xmlAttributes = []; // <PRB> 'onattribute' is called before 'onopentag' !
						this.__xmlLevel = 0;
						
						this.__listening = false;
						
						this._super();
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						const data = ev.data;

						ev.preventDefault();

						if (data.raw === io.EOF) {
							this.__xmlParser.close();
						} else {
							this.__xmlParser.write(data.valueOf());
						};
							
						if (this.options.flushMode === 'half') {
							this.flush(this.options.autoFlushOptions);
						};

						return retval;
					}),
				}));

				
				//===================================
				// Init
				//===================================
				//return function init(/*optional*/options) {
				//};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()
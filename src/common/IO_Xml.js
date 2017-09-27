//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
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

exports.add = function add(DD_MODULES) {
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
				ioMixIns = io.MixIns,
				ioXml = io.Xml;
					
					
			//===================================
			// Internal
			//===================================
					
			//// <FUTURE> Thread context
			//const __Internal__ = {
			//};
					
			//tools.complete(_shared.Natives, {
			//});

				
/* TODO: Test and debug
			ioXml.REGISTER(io.Stream.$extend(
								io.BufferedTextOutputStream,
								ioMixIns.TextTransformableIn,
								ioMixIns.ObjectTransformableOut,
			{
				$TYPE_NAME: 'Stream',
				$TYPE_UUID: '' / *! INJECT('+' + TO_SOURCE(UUID('Stream')), true) * /,

				__xmlParser: doodad.PROTECTED(null),
				__xmlAttributes: doodad.PROTECTED(null), // <PRB> 'onattribute' is called before 'onopentag' !
				__xmlLevel: doodad.PROTECTED(0),
				__xmlBuffer: doodad.PROTECTED(null),

				$Modes: doodad.PUBLIC(doodad.TYPE({
					Text: 0,
					CData: 1,
					Element: 2,
					Attribute: 3,
					DocumentType: 4,
					ProcessingInstruction: 5,
					Comment: 6,
				})),
					
				reset: doodad.OVERRIDE(function reset() {
					const sax = saxLoader.getSAX();
					const parser = sax.parser(true, tools.extend({}, this.options, {xmlns: true, position: true}));
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
					//		this.submit(new io.Data(node));
					//	});
						
					// TODO: Combine extracted datas from a chunk of 15K (Node.js's default) to a single "push" call in an Array so that we don't need a buffer size of 100000 !

					parser.onerror = doodad.Callback(this, function onerror(err) {
						this.onError(new doodad.ErrorEvent(err));
					}, true);
						
					parser.ontext = doodad.Callback(this, function ontext(text) {
						let node;

						node = {
							mode: type.$Modes.Text,
							isOpenClose: false,
							value: text,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);

					parser.onscript = doodad.Callback(this, function onscript(script) {
						let node;

						node = {
							mode: type.$Modes.CData,
							isOpenClose: false,
							value: script,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					parser.onopentag = doodad.Callback(this, function onopentag(tag) {
						this.__xmlLevel++;
							
						let node;

						node = {
							mode: type.$Modes.Element,
							name: tag.prefix || null,
							prefix: prefix,
							uri: tag.uri || null,
							isOpenClose: true,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
							
						tools.append(buffer, this.__xmlAttributes);
						this.__xmlAttributes = null;
					}, true);
						
					parser.onclosetag = doodad.Callback(this, function onclosetag(tagName) {
						this.__xmlLevel--;

						let node;

						node = {
							mode: type.$Modes.CloseElement,
							isOpenClose: true,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					parser.onattribute = doodad.Callback(this, function onattribute(attr) {
						let node;
							
						// <PRB> 'onattribute' is called before 'onopentag' !
						node = {
							mode: type.$Modes.Attribute,
							isOpenClose: false,
							name: attr.local,
							value: attr.value,
							prefix: attr.prefix || null,
							uri: attr.uri || null,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlAttributes;
						if (!buffer) {
							this.__xmlAttributes = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					parser.ondoctype = doodad.Callback(this, function ondoctype(doctype) {
						let node;

						node = {
							mode: type.$Modes.DocumentType,
							isOpenClose: false,
							value: doctype,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					parser.onprocessinginstruction = doodad.Callback(this, function onprocessinginstruction(instr) {
						let node;

						node = {
							mode: type.$Modes.ProcessingInstruction,
							isOpenClose: false,
							name: instr.name,
							value: instr.body,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					// TODO: onopencomment, onclosecomment
					parser.oncomment = doodad.Callback(this, function oncomment(comment) {
						let node;

						node = {
							mode: type.$Modes.Comment,
							isOpenClose: false,
							value: comment,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					parser.onopencdata = doodad.Callback(this, function onopencdata() {
						let node;

						this.__xmlLevel++;

						node = {
							mode: type.$Modes.CData,
							isOpenClose: true,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);

					parser.oncdata = doodad.Callback(this, function oncdata(cdata) {
						let node;

						node = {
							mode: type.$Modes.CData,
							isOpenClose: false,
							value: cdata,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					parser.onclosecdata = doodad.Callback(this, function onclosecdata() {
						let node;

						this.__xmlLevel--;

						node = {
							mode: type.$Modes.CData,
							isOpenClose: true,
							level: this.__xmlLevel,
							fileLine: this.__xmlParser.line + 1,
							fileColumn: this.__xmlParser.column + 1,
						};

						let buffer = this.__xmlBuffer;
						if (!buffer) {
							this.__xmlBuffer = buffer = [];
						};
						buffer.push(node);
					}, true);
						
					//parser.onend = doodad.Callback(this, function onend() {
					//}, true);

					this.__xmlParser = parser;
					this.__xmlAttributes = null; // <PRB> 'onattribute' is called before 'onopentag' !
					this.__xmlLevel = 0;
					this.__xmlBuffer = null;
						
					this._super();
				}),

				onWrite: doodad.OVERRIDE(function onWrite(ev) {
					const retval = this._super(ev);

					const data = ev.data;

					ev.preventDefault();

					this.__xmlBuffer = null;

					if (data.raw === io.EOF) {
						// NOTE: 'close' will finish parsing synchronously
						this.__xmlParser.close();
					} else {
						// NOTE: 'write' will parse synchronously
						const xml = data.toString();
						this.__xmlParser.write(xml);
					};
							
					const buffer = this.__xmlBuffer;
					if (buffer) {
						this.__xmlBuffer = null;
						this.submit(new io.Data({
							Modes: types.getType(this).$Modes,
							buffer: buffer,
						}), {callback: data.defer()});
					};

					if (data.raw === io.EOF) {
						this.submit(new io.Data(io.EOF), {callback: data.defer()});
					};

					return retval;
				}),
			}));
*/
				
			//===================================
			// Init
			//===================================
			//return function init(/*optional*/options) {
			//};
		},
	};
	return DD_MODULES;
};

//! END_MODULE()
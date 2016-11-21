//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: Tools_Xml.js - XML tools
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2016 Claude Petit
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
		DD_MODULES['Doodad.Tools.Xml'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			namespaces: ['Parsers'],
			
			create: function create(root, /*optional*/_options, _shared) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================
					
				var doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					namespaces = doodad.Namespaces,
					xml = tools.Xml,
					xmlParsers = xml.Parsers;
					
					
				//===================================
				// Internal
				//===================================
					
				// <FUTURE> Thread context
				var __Internal__ = {
					xmlEntities: null,
					parsers: [],
				};
					
				types.complete(_shared.Natives, {
					windowArray: global.Array,
					symbolIterator: (types.isSymbol(global.Symbol.iterator) ? global.Symbol.iterator : undefined),
				});
					
				//===================================
				// XML Types
				//===================================
				
				__Internal__.iterProto = null;
				if (types.hasSymbols() && types.hasGenerators() && _shared.Natives.symbolIterator) {
					// NOTE: Must use "eval" to compile with old browsers
					__Internal__.iterProto = types.evalStrict(
						"({" +
							"[ctx.natives.symbolIterator]: function* iter() {" +
								"this.__changed = false;" +
								"for (let i = 0; i < this.__nodes.length; i++) {" +
									"yield this.__nodes[i];" +
									"if (this.__changed) {" +
										"throw new types.Error('The list has been modified.');" +
									"};" +
								"};" +
							"}," +
						"})"
					, {natives: _shared.Natives});
				};
				
				xml.ADD('NodesList', types.CustomEventTarget.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'NodesList',
					},
					/*instanceProto*/
					types.extend(
						{
							__parentNode: null,
							__nodeTypes: null,
							__nodes: null,
							__changed: false,
							
							_new: types.SUPER(function _new(parentNode, nodeTypes) {
								this._super();
								if (!types.isArray(nodeTypes)) {
									nodeTypes = [nodeTypes];
								};
								this.__parentNode = parentNode;
								this.__nodeTypes = nodeTypes;
								this.__nodes = [];
							}),
							
							append: function append(node) {
								if (!types._instanceof(node, this.__nodeTypes)) {
									throw new types.TypeError("Invalid node type.");
								};
								this.__nodes.push(node);
								node.__parentNode = this.__parentNode;
								this.__changed = true;
								this.dispatchEvent(new types.CustomEvent('add', {detail: {node: node}}));
								return this;
							},
							prepend: function prepend(node) {
								if (!types._instanceof(node, this.__nodeTypes)) {
									throw new types.TypeError("Invalid node type.");
								};
								this.__nodes.unshift(node);
								node.__parentNode = this.__parentNode;
								this.__changed = true;
								this.dispatchEvent(new types.CustomEvent('add', {detail: {node: node}}));
								return this;
							},
							insertAt: function insertAt(pos, node) {
								if (!types._instanceof(node, this.__nodeTypes)) {
									throw new types.TypeError("Invalid node type.");
								};
								this.__nodes.splice(pos, 0, node);
								node.__parentNode = this.__parentNode;
								this.__changed = true;
								this.dispatchEvent(new types.CustomEvent('add', {detail: {node: node}}));
								return this;
							},
							remove: function remove(node) {
								for (var i = 0; i < this.__nodes.length; i++) {
									if (this.__nodes[i] === node) {
										this.__nodes.splice(i, 1);
										node.__parentNode = null;
										this.__changed = true;
										this.dispatchEvent(new types.CustomEvent('remove', {detail: {node: node}}));
										break;
									};
								};
								return this;
							},
							removeAt: function removeAt(pos) {
								var node = this.__nodes.splice(pos, 1)[0];
								if (node) {
									node.__parentNode = null;
									this.__changed = true;
									this.dispatchEvent(new types.CustomEvent('remove', {detail: {node: node}}));
								};
								return this;
							},
							clear: function clear() {
								for (var i = 0; i < this.__nodes.length; i++) {
									var node = this.__nodes[i];
									node.__parentNode = null;
									this.__changed = true;
									this.dispatchEvent(new types.CustomEvent('remove', {detail: {node: node}}));
								};
								this.__nodes = [];
								return this;
							},
							find: function find(name) {
								var result = [];
								for (var i = 0; i < this.__nodes.length; i++) {
									var node = this.__nodes[i];
									if (node.__name === name) {
										result.push(node);
									};
								};
								return result;
							},
							forEach: function forEach(fn, /*optional*/thisObj) {
								this.__changed = false;
								for (var i = 0; i < this.__nodes.length; i++) {
									fn.call(thisObj, this.__nodes[i], i, this.__nodes);
									if (this.__changed) {
										throw new types.Error('The list has been modified.');
									};
								};
								return this;
							},
							getCount: function getCount() {
								return this.__nodes.length;
							},
							getAt: function getAt(pos) {
								return this.__nodes[pos];
							},
							getParent: function getParent() {
								return this.__parentNode;
							},
						},
						__Internal__.iterProto
					)
				));
					
				xml.ADD('Node', types.Type.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Node',
					},
					/*instanceProto*/
					{
						__parentNode: null,

						line: 0,
						column: 0,
						
						getParent: function getParent() {
							return this.__parentNode;
						},
					}
				));
					
				xml.ADD('Element', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Element',
					},
					/*instanceProto*/
					{
						__prefix: null,
						__baseURI: null,
						__name: null,
						__attributes: null,
						__childNodes: null,
						
						_new: types.SUPER(function _new(name, /*optional*/prefix, /*optional*/baseURI) {
							this._super();
							this.__prefix = prefix;
							this.__baseURI = baseURI;
							this.__name = name;
							this.__attributes = new xml.NodesList(this, xml.Attribute);
							this.__childNodes = new xml.NodesList(this, [xml.Element, xml.Text, xml.CDataSection, xml.Comment]);
						}),
					
						getName: function getName() {
							return this.__name;
						},
						setName: function setName(name) {
							this.__name = name;
						},
						hasAttr: function hasAttr(name) {
							var result = this.__attributes.find(name);
							return !!result.length;
						},
						getAttr: function getAttr(name) {
							var result = this.__attributes.find(name);
							if (result.length) {
								return result[0].getValue();
							};
						},
						getAttrs: function getAttrs() {
							return this.__attributes;
						},
						getChildren: function getChildren() {
							return this.__childNodes;
						},
						getPrefix: function getPrefix() {
							return this.__prefix;
						},
						setPrefix: function setPrefix(prefix) {
							this.__prefix = prefix;
						},
						getBaseURI: function getBaseURI() {
							return this.__baseURI;
						},
						setBaseURI: function setBaseURI(uri) {
							this.__baseURI = uri;
						},
						//toString: function() {
						//},
					}
				));
					
				xml.ADD('Attribute', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Attribute',
					},
					/*instanceProto*/
					{
						__prefix: null,
						__baseURI: null,
						__name: null,
						__value: null,
						
						_new: types.SUPER(function _new(name, value, /*optional*/prefix, /*optional*/baseURI) {
							this._super();
							this.__prefix = prefix;
							this.__baseURI = baseURI;
							this.__name = name;
							this.__value = value;
						}),

						getName: function getName() {
							return this.__name;
						},
						setName: function setName(name) {
							this.__name = name;
						},
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						getPrefix: function getPrefix() {
							return this.__prefix;
						},
						setPrefix: function setPrefix(prefix) {
							this.__prefix = prefix;
						},
						getBaseURI: function getBaseURI() {
							return this.__baseURI;
						},
						setBaseURI: function setBaseURI(uri) {
							this.__baseURI = uri;
						},

						//toString: function() {
						//},
					}
				));
					
				xml.ADD('Text', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Text',
					},
					/*instanceProto*/
					{
						__value: null,

						_new: types.SUPER(function _new(text) {
							this._super();
							this.__value = text;
						}),
						
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
					
				xml.ADD('CDATASection', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'CDATASection',
					},
					/*instanceProto*/
					{
						__value: null,

						_new: types.SUPER(function _new(data) {
							this._super();
							this.__value = data;
						}),
						
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
					
				/*
				xml.ADD('EntityReference', xml.Node.$inherit(
					/ *typeProto* /
					{
						$TYPE_NAME: 'EntityReference',
					},
					/ *instanceProto* /
					{
						__name: null,
						__value: null,
						
						_new: types.SUPER(function _new(name, value) {
							this._super();
							this.__name = name;
							this.__value = value;
						}),
						
						getName: function getName() {
							return this.__name;
						},
						setName: function setName(name) {
							this.__name = name;
						},
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
				*/
					
				xml.ADD('Entity', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Entity',
					},
					/*instanceProto*/
					{
						__name: null,
						__value: null,

						_new: types.SUPER(function _new(name, value) {
							this._super();
							this.__name = name;
							this.__value = value;
						}),
						
						getName: function getName() {
							return this.__name;
						},
						setName: function setName(name) {
							this.__name = name;
						},
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
					
				xml.ADD('ProcessingInstruction', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'ProcessingInstruction',
					},
					/*instanceProto*/
					{
						__name: null,
						__value: null,

						_new: types.SUPER(function _new(name, value) {
							this._super();
							this.__name = name;
							this.__value = value;
						}),
						
						getName: function getName() {
							return this.__name;
						},
						setName: function setName(name) {
							this.__name = name;
						},
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
					
				xml.ADD('Comment', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Comment',
					},
					/*instanceProto*/
					{
						__value: null,

						_new: types.SUPER(function _new(text) {
							this._super();
							this.__value = text;
						}),
						
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
					
				xml.ADD('DocumentType', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'DocumentType',
					},
					/*instanceProto*/
					{
						__value: null,

						_new: types.SUPER(function _new(type) {
							this._super();
							this.__value = type;
						}),
						
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
					
				xml.ADD('DocumentFragment', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'DocumentFragment',
					},
					/*instanceProto*/
					{
						__value: null,

						_new: types.SUPER(function _new(value) {
							this._super();
							this.__value = value;
						}),
						
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
				
				/*				
				xml.ADD('Notation', xml.Node.$inherit(
					/ *typeProto* /
					{
						$TYPE_NAME: 'Notation',
					},
					/ *instanceProto* /
					{
						__name: null,
						__value: null,
						
						_new: types.SUPER(function _new(name, value) {
							this._super();
							this.__name = name;
							this.__value = value;
						}),
						
						getName: function getName() {
							return this.__name;
						},
						setName: function setName(name) {
							this.__name = name;
						},
						getValue: function getValue() {
							return this.__value;
						},
						setValue: function setValue(value) {
							this.__value = value;
						},
						//toString: function() {
						//},
					}
				));
				*/
					
				xml.ADD('Document', xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Document',
					},
					/*instanceProto*/
					{
						__childNodes: null,
						__entities: null,
						__instructions: null,
						__doctype: null,
						__root: null,
						
						_new: types.SUPER(function _new() {
							this._super();
							this.__childNodes = new xml.NodesList(this, [xml.Element, xml.Text, xml.CDataSection, xml.Comment]);
							this.__childNodes.addEventListener('add', types.bind(this, this.__onChildNodesAdd));
							this.__childNodes.addEventListener('remove', types.bind(this, this.__onChildNodesRemove));
							this.__instructions = new xml.NodesList(this, xml.ProcessingInstruction);
							this.__entities = new xml.NodesList(this, [xml.EntityReference, xml.Entity]);
						}),
						
						__onChildNodesAdd: function __onChildNodesAdd(ev) {
							if (!this.__root && (ev.detail.node instanceof xml.Element)) {
								this.__root = ev.detail.node;
							};
						},
						
						__onChildNodesRemove: function __onChildNodesRemove(ev) {
							if (ev.detail.node === this.__root) {
								this.__root = null;
								for (var i = 0; i < this.__childNodes.__nodes.length; i++) {
									var node = this.__childNodes.__nodes[i];
									if (node instanceof xml.Element) {
										this.__root = node;
										break;
									};
								};
							};
						},
						
						getChildren: function getChildren() {
							return this.__childNodes;
						},
						getDocumentType: function getDocumentType() {
							return this.__doctype;
						},
						setDocumentType: function setDocumentType(node) {
							if (!types.isNothing(node) && !types._instanceof(node, xml.DocumentType)) {
								throw new types.TypeError("Invalid document type node.");
							};
							if (this.__doctype) {
								this.__doctype.__parentNode = null;
							};
							this.__doctype = node;
							node.__parentNode = this;
							return this;
						},
						getRoot: function getRoot() {
							return this.__root;
						},
						setRoot: function setRoot(node) {
							if (!(node instanceof xml.Element)) {
								throw new types.TypeError("Invalid root element.");
							};
							var ok = false;
							if (this.__root) {
								for (var i = 0; i < this.__childNodes.__nodes.length; i++) {
									if (this.__childNodes.__nodes[i] === this.__root) {
										this.__root.__parentNode = null;
										this.__root = null;
										this.__childNodes.removeAt(i);
										this.__childNodes.insertAt(i, node);
										ok = true;
										break;
									};
								};
							};
							if (!ok) {
								this.__root.__parentNode = null;
								this.__root = null;
								this.__childNodes.prepend(node);
							};
						},
						getEntities: function getEntities() {
							return this.__entities;
						},
						getInstructions: function getInstructions() {
							return this.__instructions;
						},
						//toString: function() {
						//},
					}
				));
					
				//===================================
				// XML Tools
				//===================================

				xml.ADD('addXmlEntities', function addXmlEntities(entities) {
					__Internal__.xmlEntities = types.extend(__Internal__.xmlEntities || {}, entities);
				});
				
				xml.ADD('registerParser', function registerParser(parser) {
					__Internal__.parsers = types.unique(__Internal__.parsers, [parser]);
				});
				
				xml.ADD('getEntities', function getEntities() {
					return __Internal__.xmlEntities;
				});
				
				xml.ADD('parse', function parse(stream, /*optional*/options, /*optional*/parser) {
					// TODO: MemoryStream for Strings
					if (parser) {
						if ((tools.indexOf(__Internal__.parsers, parser) < 0)) {
							throw new types.ParseError('Invalid XML parser.');
						};
					} else {
						parser = tools.filter(__Internal__.parsers, function(parser) {
							return parser.isAvailable();
						})[0];
					};
					if (!parser || !parser.isAvailable()) {
						throw new types.ParseError('The XML parser is not available.');
					};
					if (__Internal__.xmlEntities && !types.has(options, 'entities')) {
						options = types.extend({
							entities: __Internal__.xmlEntities,
						}, options);
					};
					return parser.parse(stream, options);
				});
				
				xml.ADD('isAvailable', function isAvailable() {
					return !!tools.filter(__Internal__.parsers, function(parser) {
						return parser.isAvailable();
					}).length;
				});
				
				
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
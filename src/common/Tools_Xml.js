//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework
// File: Tools_Xml.js - XML tools
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
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

(function() {
	var global = this;
	
	var exports = {};
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.Tools.Xml'] = {
			type: null,
			version: '1.1r',
			namespaces: ['Parsers'],
			dependencies: ['Doodad.Types', 'Doodad.Tools'],
			
			create: function create(root, /*optional*/_options) {
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
					
				//===================================
				// XML Types
				//===================================
				
				// Source: http://www.w3schools.com/Xml/dom_nodetype.asp

				xml.NodeTypes = {
					Element: 1,
					Attr: 2,
					Text: 3,
					CDATASection: 4,
					EntityReference: 5,
					Entity: 6,
					ProcessingInstruction: 7,
					Comment: 8,
					Document: 9,
					DocumentType: 10,
					DocumentFragment: 11,
					Notation: 12,
				};
				
				/* INCOMPATIBLE WITH SOME BROWSERS
				xml.NodeNames = {
					[xml.NodeTypes.Element]: null, // name of the element
					[xml.NodeTypes.Attr]: null, // name of the attribute
					[xml.NodeTypes.Text]: '#text',
					[xml.NodeTypes.CDATASection]: '#cdata-section',
					[xml.NodeTypes.EntityReference]: null, // entity reference name
					[xml.NodeTypes.Entity]: null, // entity name
					[xml.NodeTypes.ProcessingInstruction]: null, // target
					[xml.NodeTypes.Comment]: '#comment',
					[xml.NodeTypes.Document]: '#document',
					[xml.NodeTypes.DocumentType]: null, // doctype name
					[xml.NodeTypes.DocumentFragment]: '#document fragment',
					[xml.NodeTypes.Notation]: null, // notation name
				};
				*/
				xml.NodeNames = {};
					xml.NodeNames[xml.NodeTypes.Element] = null; // name of the element
					xml.NodeNames[xml.NodeTypes.Attr] = null; // name of the attribute
					xml.NodeNames[xml.NodeTypes.Text] = '#text';
					xml.NodeNames[xml.NodeTypes.CDATASection] = '#cdata-section';
					xml.NodeNames[xml.NodeTypes.EntityReference] = null; // entity reference name
					xml.NodeNames[xml.NodeTypes.Entity] = null; // entity name
					xml.NodeNames[xml.NodeTypes.ProcessingInstruction] = null; // target
					xml.NodeNames[xml.NodeTypes.Comment] = '#comment';
					xml.NodeNames[xml.NodeTypes.Document] = '#document';
					xml.NodeNames[xml.NodeTypes.DocumentType] = null; // doctype name
					xml.NodeNames[xml.NodeTypes.DocumentFragment] = '#document fragment';
					xml.NodeNames[xml.NodeTypes.Notation] = null; // notation name

					
				xml.Node = types.Type.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'XmlNode',
					},
					/*instanceProto*/
					{
						parentNode: null,
						nodeType: xml.NodeTypes.Element,
						prefix: null,
						baseURI: null,
						nodeName: null,
						nodeValue: null,
						attributes: null,
						childNodes: null,

						fileLine: 0,
						fileColumn: 0,
						
						_new: types.SUPER(function _new(parentNode, nodeType, nodeName, /*optional*/prefix, /*optional*/baseURI, /*optional*/nodeValue) {
							this._super();
							this.parentNode = parentNode;
							this.nodeType = nodeType;
							this.prefix = ((prefix || '').toLowerCase() || null);
							this.baseURI = (this.prefix && (baseURI || '').toLowerCase() || null);
							this.nodeName = types.get(xml.NodeNames, nodeType) || nodeName.toLowerCase();
							this.nodeValue = nodeValue;
							this.attributes = {};
							this.childNodes = [];
							if (parentNode) {
								if (nodeType === xml.NodeTypes.Attr) {
									parentNode.attributes[this.nodeName] = this;
								} else if (parentNode.nodeType === xml.NodeTypes.Document) {
									if ((nodeType === xml.NodeTypes.Element) && (!parentNode.root)) {
										parentNode.root = this;
										parentNode.childNodes.push(this);
									} else if (nodeType === xml.NodeTypes.ProcessingInstruction) {
										parentNode.processingInstructions.push(this);
									} else if ((nodeType === xml.NodeTypes.DocumentType) && (!parentNode.doctype)) {
										parentNode.doctype = this;
									} else if ((nodeType === xml.NodeTypes.Entity) || (nodeType === xml.NodeTypes.EntityReference)) {
										parentNode.entities.push(this);
									} else if (nodeType === xml.NodeTypes.Text) {
										parentNode.childNodes.push(this);
									} else {
										throw new types.ParseError("Invalid child node type.");
									};
								} else if ([xml.NodeTypes.Element, xml.NodeTypes.Text, xml.NodeTypes.CDATASection, xml.NodeTypes.Comment].indexOf(nodeType) >= 0) {
									parentNode.childNodes.push(this);
								} else {
									throw new types.ParseError("Invalid child node type.");
								};
							};
						}),
						
						hasAttr: function hasAttr(name) {
							return types.hasKey(this.attributes, name);
						},
						getAttr: function getAttr(name) {
							if (this.hasAttr(name)) {
								var attr = this.attributes[name];
								return attr && attr.nodeValue || '';
							};
						},

						// TODO: 'toXML'
					}
				);
					
				xml.Document = xml.Node.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'XmlDocument',
					},
					/*instanceProto*/
					{
						entities: null,
						processingInstructions: null,
						doctype: null,
						entities: null,
						root: null,
						
						_new: types.SUPER(function _new() {
							this._super(null, xml.NodeTypes.Document, "", null, null, "");
							this.processingInstructions = [];
							this.entities = [];
						}),
					}
				);
					
				//===================================
				// XML Tools
				//===================================

				xml.addXmlEntities = function addXmlEntities(entites) {
					__Internal__.xmlEntities = types.extend(__Internal__.xmlEntities || {}, entites);
				};
				
				xml.registerParser = function registerParser(parser) {
					__Internal__.parsers = types.unique(__Internal__.parsers, [parser]);
				};
				
				xml.getEntities = function getEntities() {
					return __Internal__.xmlEntities;
				};
				
				xml.parse = function parse(stream, /*optional*/options, /*optional*/parser) {
					if (parser) {
						if ((__Internal__.parsers.indexOf(parser) < 0)) {
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
					if (__Internal__.xmlEntities && !types.hasKey(options, 'entities')) {
						options = types.extend({
							entities: __Internal__.xmlEntities,
						}, options);
					};
					return parser.parse(stream, options);
				};
				
				xml.isAvailable = function isAvailable() {
					return !!tools.filter(__Internal__.parsers, function(parser) {
						return parser.isAvailable();
					}).length;
				};
				
				//===================================
				// Init
				//===================================
				//return function init(/*optional*/options) {
				//};
			},
		};
		
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));
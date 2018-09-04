// doodad-js - Object-oriented programming framework
// File: libxml.c - libxml2 C Helper functions for JS integration.
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

#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>

#include <libxml/xmlmemory.h>
#include <libxml/xmlstring.h>
#include <libxml/parser.h>
#include <libxml/tree.h>
#include <libxml/SAX2.h>
#include <libxml/xmlschemas.h>

#include "buf.h"

#define PTR_LEN	sizeof(void *)

int xmlPtrLen() {
	return PTR_LEN;
};

void xmlFreeEx(void * ptr) {
	xmlFree(ptr);
	ptr = NULL;
};

xmlSAXHandlerPtr xmlCreateMySAXHandler(
		    internalSubsetSAXFunc internalSubset,
		    isStandaloneSAXFunc isStandalone,
		    hasInternalSubsetSAXFunc hasInternalSubset,
		    hasExternalSubsetSAXFunc hasExternalSubset,
		    resolveEntitySAXFunc resolveEntity,
		    getEntitySAXFunc getEntity,
		    entityDeclSAXFunc entityDecl,
		    notationDeclSAXFunc notationDecl,
		    attributeDeclSAXFunc attributeDecl,
		    elementDeclSAXFunc elementDecl,
		    unparsedEntityDeclSAXFunc unparsedEntityDecl,
		    setDocumentLocatorSAXFunc setDocumentLocator,
		    startDocumentSAXFunc startDocument,
		    endDocumentSAXFunc endDocument,
		    startElementSAXFunc startElement,
		    endElementSAXFunc endElement,
		    referenceSAXFunc reference,
		    charactersSAXFunc characters,
		    ignorableWhitespaceSAXFunc ignorableWhitespace,
		    processingInstructionSAXFunc processingInstruction,
		    commentSAXFunc comment,
		    warningSAXFunc warning,
		    errorSAXFunc error,
		    getParameterEntitySAXFunc getParameterEntity,
		    cdataBlockSAXFunc cdataBlock,
		    externalSubsetSAXFunc externalSubset,
		    startElementNsSAX2Func startElementNs,
		    endElementNsSAX2Func endElementNs,
		    xmlStructuredErrorFunc serror
		) {
	xmlSAXHandlerPtr sax = (xmlSAXHandlerPtr) malloc(sizeof(xmlSAXHandler));
	if (NULL == sax) {
		return NULL;
	};
	memset(sax, 0, sizeof(xmlSAXHandler));
	//sax->initialized = XML_SAX2_MAGIC;
	int res = xmlSAXVersion(sax, 2);
	if (0 != res) {
		free((void *) sax);
		sax = NULL;
		return NULL;
	};
	if (NULL != internalSubset) {
		sax->internalSubset = internalSubset;
	}
	if (NULL != isStandalone) {
		sax->isStandalone = isStandalone;
	}
	if (NULL != hasInternalSubset) {
		sax->hasInternalSubset = hasInternalSubset;
	}
	if (NULL != hasExternalSubset) {
		sax->hasExternalSubset = hasExternalSubset;
	}
	if (NULL != resolveEntity) {
		sax->resolveEntity = resolveEntity;
	}
	if (NULL != getEntity) {
		sax->getEntity = getEntity;
	}
	if (NULL != entityDecl) {
		sax->entityDecl = entityDecl;
	}
	if (NULL != notationDecl) {
		sax->notationDecl = notationDecl;
	}
	if (NULL != attributeDecl) {
		sax->attributeDecl = attributeDecl;
	}
	if (NULL != elementDecl) {
		sax->elementDecl = elementDecl;
	}
	if (NULL != unparsedEntityDecl) {
		sax->unparsedEntityDecl = unparsedEntityDecl;
	}
	if (NULL != setDocumentLocator) {
		sax->setDocumentLocator = setDocumentLocator;
	}
	if (NULL != startDocument) {
		sax->startDocument = startDocument;
	}
	if (NULL != endDocument) {
		sax->endDocument = endDocument;
	}
	if (NULL != startElement) {
		sax->startElement = startElement;
	}
	if (NULL != endElement) {
		sax->endElement = endElement;
	}
	if (NULL != reference) {
		sax->reference = reference;
	}
	if (NULL != characters) {
		sax->characters = characters;
	}
	if (NULL != ignorableWhitespace) {
		sax->ignorableWhitespace = ignorableWhitespace;
	}
	if (NULL != processingInstruction) {
		sax->processingInstruction = processingInstruction;
	}
	if (NULL != comment) {
		sax->comment = comment;
	}
	if (NULL != warning) {
		sax->warning = warning;
	}
	if (NULL != error) {
		sax->error = error;
	}
	if (NULL != getParameterEntity) {
		sax->getParameterEntity = getParameterEntity;
	}
	if (NULL != cdataBlock) {
		sax->cdataBlock = cdataBlock;
	}
	if (NULL != externalSubset) {
		sax->externalSubset = externalSubset;
	}
	if (NULL != startElementNs) {
		sax->startElementNs = startElementNs;
	}
	if (NULL != endElementNs) {
		sax->endElementNs = endElementNs;
	}
	if (NULL != serror) {
		sax->serror = serror;
	}
	return sax;
};

void xmlFreeMySAXHandler(xmlSAXHandlerPtr sax) {
	if (NULL != sax) {
		free(sax);
		sax = NULL;
	};
};

//static int readFunc(void * context, char * buffer, int len) {
//	return 0;
//};

//static int closeFunc(void * context) {
//	return 0;
//};

xmlParserInputPtr xmlCreateMyParserInput(
	xmlParserCtxtPtr parserCtxt,
	const char * content,
	int contentLen
	//const char * filename
			//void * readContext,
			//xmlInputReadCallback readFunc, // The function used to read
			//xmlInputCloseCallback closeFunc // The function used to end reading and free resources
) {
	xmlParserInputPtr parserInput = NULL;
	//xmlParserInputBufferPtr inputBuffer = xmlAllocParserInputBuffer(XML_CHAR_ENCODING_UTF8);
	xmlParserInputBufferPtr inputBuffer = xmlParserInputBufferCreateMem(content, contentLen, XML_CHAR_ENCODING_UTF8);
	if (NULL != inputBuffer) {
		parserInput = (xmlParserInputPtr) xmlMalloc(sizeof(xmlParserInput));
		if (NULL != parserInput) {
			//inputBuffer->readcallback = readFunc;
			//inputBuffer->closecallback = closeFunc;
			//inputBuffer->context = NULL;
			memset(parserInput, 0, sizeof(xmlParserInput));
			parserInput->line = 1;
			parserInput->col = 1;
			parserInput->standalone = -1;
			parserInput->buf = inputBuffer;
			//parserInput->filename = (char *) xmlStrdup((const xmlChar *) filename);
			if (parserCtxt != NULL) {
				parserInput->id = parserCtxt->input_id++;
			};
			xmlBufResetInput(parserInput->buf->buffer, parserInput);
			//xmlPushInput(parserCtxt, parserInput);
				//// TODO: Check "parserCtxt->inputMax"
				//parserCtxt->inputTab[parserCtxt->inputNr] = parserInput;
				//parserCtxt->input = parserInput;
				//parserCtxt->inputNr++;
		} else {
			xmlFreeParserInputBuffer(inputBuffer);
			inputBuffer = NULL;
		};
	};
	return parserInput;
};

void * xmlGetUserDataFromParserCtxt(xmlParserCtxtPtr parserCtxt) {
	return parserCtxt->_private;
};

//const char * xmlGetFilenameFromParserContext(xmlParserCtxtPtr parserCtxt) {
//	if (NULL != parserCtxt->input->filename) {
//		return parserCtxt->input->filename;
//	} else {
//		for (int i = 0; i < parserCtxt->inputNr; i++) {
//			if (NULL != parserCtxt->inputTab[i]->filename) {
//				return parserCtxt->inputTab[i]->filename;
//			};
//		};
//		return NULL;
//	};
//};

char * xmlFormatGenericError(void * ctx ATTRIBUTE_UNUSED, char * template, ...) {
	va_list ap;
	va_start(ap, template); 
	char * msg = va_arg(ap, char *);
  	va_end(ap);
	return msg;
};

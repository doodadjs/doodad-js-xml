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
			fatalErrorSAXFunc fatalError,
		    getParameterEntitySAXFunc getParameterEntity,
		    cdataBlockSAXFunc cdataBlock,
		    externalSubsetSAXFunc externalSubset,
		    startElementNsSAX2Func startElementNs,
		    endElementNsSAX2Func endElementNs,
		    xmlStructuredErrorFunc serror
		) {
	xmlSAXHandlerPtr sax = (xmlSAXHandlerPtr) xmlMalloc(sizeof(xmlSAXHandler));
	if (NULL == sax) {
		return NULL;
	};
	memset(sax, 0, sizeof(xmlSAXHandler));
	//sax->initialized = XML_SAX2_MAGIC;
	int res = xmlSAXVersion(sax, 2);
	if (0 != res) {
		xmlFree((void *) sax);
		sax = NULL;
		return NULL;
	};
	sax->internalSubset = internalSubset;
	sax->isStandalone = isStandalone;
	sax->hasInternalSubset = hasInternalSubset;
	sax->hasExternalSubset = hasExternalSubset;
	sax->resolveEntity = resolveEntity;
	sax->getEntity = getEntity;
	sax->entityDecl = entityDecl;
	sax->notationDecl = notationDecl;
	sax->attributeDecl = attributeDecl;
	sax->elementDecl = elementDecl;
	sax->unparsedEntityDecl = unparsedEntityDecl;
	sax->setDocumentLocator = setDocumentLocator;
	sax->startDocument = startDocument;
	sax->endDocument = endDocument;
	sax->startElement = startElement;
	sax->endElement = endElement;
	sax->reference = reference;
	sax->characters = characters;
	sax->ignorableWhitespace = ignorableWhitespace;
	sax->processingInstruction = processingInstruction;
	sax->comment = comment;
	sax->warning = warning;
	sax->error = error;
	sax->fatalError = fatalError;
	sax->getParameterEntity = getParameterEntity;
	sax->cdataBlock = cdataBlock;
	sax->externalSubset = externalSubset;
	sax->startElementNs = startElementNs;
	sax->endElementNs = endElementNs;
	sax->serror = serror;
	return sax;
};

void xmlFreeMySAXHandler(xmlSAXHandlerPtr sax) {
	if (NULL != sax) {
		xmlFree(sax);
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
	va_list args;
	const size_t MAX_MSG_LEN = 2048;
	char * msg = xmlMalloc(MAX_MSG_LEN);
	if (NULL == msg) {
		return NULL;
	}
	va_start(args, template);
	int count = vsnprintf(msg, MAX_MSG_LEN, template, args); // "\0" is included in "MAX_MSG_LEN"
  	va_end(args);
	if (count < 0) {
		// "vsnprintf" failed.
		// (also glibc < 2.0.6 returns -1 when string is truncated)
		xmlFree(msg);
		msg = NULL;
		return NULL;
	}
	count++; // Now includes "\0" in "count" 
	char * msg2 = xmlRealloc(msg, count);
	if (NULL == msg2) {
		// "xmlRealloc" failed.
		xmlFree(msg);
		msg = NULL;
		return NULL;
	}
	int count2 = vsnprintf(msg2, count, template, args); // "\0" is included in "count" 
	if ((count2 < 0) || (count2 >= count)) {
		// "vsnprintf" failed again.
		xmlFree(msg2);
		msg2 = NULL;
		return NULL;
	}
	return msg2;
};

typedef enum {
	XML_SERROR_FIELD_NONE = 0,
	XML_SERROR_FIELD_DOMAIN = 1,
	XML_SERROR_FIELD_CODE = 2,
	XML_SERROR_FIELD_MESSAGE = 3,
	XML_SERROR_FIELD_LEVEL = 4,
	XML_SERROR_FIELD_FILE = 5,
	XML_SERROR_FIELD_LINE = 6,
	XML_SERROR_FIELD_STR1 = 7,
	XML_SERROR_FIELD_STR2 = 8,
	XML_SERROR_FIELD_STR3 = 9,
	XML_SERROR_FIELD_INT1 = 10,
	XML_SERROR_FIELD_INT2 = 11,
	XML_SERROR_FIELD_CTXT = 12,
	XML_SERROR_FIELD_NODE = 13
} xmlStructuredErrorField;

int xmlGetStructuredErrorField_Int(xmlErrorPtr error, xmlStructuredErrorField field) {
	int result = 0;
	switch (field) {
		case XML_SERROR_FIELD_DOMAIN:
			result = error->domain;
			break;
		case XML_SERROR_FIELD_CODE:
			result = error->code;
			break;
		//case XML_SERROR_FIELD_MESSAGE:
		//	result = error->message;
		//	break;
		case XML_SERROR_FIELD_LEVEL:
			result = (int) error->level;
			break;
		//case XML_SERROR_FIELD_FILE:
		//	return error->file;
		//	break;
		case XML_SERROR_FIELD_LINE:
			result = error->line;
			break;
		//case XML_SERROR_FIELD_STR1:
		//	result = error->str1;
		//	break;
		//case XML_SERROR_FIELD_STR2:
		//	result = error->str2;
		//	break;
		//case XML_SERROR_FIELD_STR3:
		//	result = error->str3;
		//	break;
		case XML_SERROR_FIELD_INT1:
			result = error->int1;
			break;
		case XML_SERROR_FIELD_INT2:
			result = error->int2;
			break;
		//case XML_SERROR_FIELD_CTXT:
		//	result = error->ctxt;
		//	break;
		//case XML_SERROR_FIELD_NODE:
		//	result = error->node;
		//	break;
		default:
			break;
	}
    return result;
};

char * xmlGetStructuredErrorField_Str(xmlErrorPtr error, xmlStructuredErrorField field) {
	char * result = NULL;
	switch (field) {
		//case XML_SERROR_FIELD_DOMAIN:
		//	result = error->domain;
		//	break;
		//case XML_SERROR_FIELD_CODE:
		//	result = error->code;
		//	break;
		case XML_SERROR_FIELD_MESSAGE:
			result = error->message;
			break;
		//case XML_SERROR_FIELD_LEVEL:
		//	result = error->level;
		//	break;
		case XML_SERROR_FIELD_FILE:
			return error->file;
			break;
		//case XML_SERROR_FIELD_LINE:
		//	result = error->line;
		//	break;
		case XML_SERROR_FIELD_STR1:
			result = error->str1;
			break;
		case XML_SERROR_FIELD_STR2:
			result = error->str2;
			break;
		case XML_SERROR_FIELD_STR3:
			result = error->str3;
			break;
		//case XML_SERROR_FIELD_INT1:
		//	result = error->int1;
		//	break;
		//case XML_SERROR_FIELD_INT2:
		//	result = error->int2;
		//	break;
		//case XML_SERROR_FIELD_CTXT:
		//	result = error->ctxt;
		//	break;
		//case XML_SERROR_FIELD_NODE:
		//	result = error->node;
		//	break;
		default:
			break;
	}
    return result;
};

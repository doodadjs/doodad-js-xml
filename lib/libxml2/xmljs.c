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
	xmlSAXHandlerPtr sax = (xmlSAXHandlerPtr) xmlMalloc(sizeof(xmlSAXHandler));
	if (NULL != sax) {
		memset(sax, 0, sizeof(xmlSAXHandler));
		sax->initialized = XML_SAX2_MAGIC;
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
		sax->getParameterEntity = getParameterEntity;
		sax->cdataBlock = cdataBlock;
		sax->externalSubset = externalSubset;
		sax->startElementNs = startElementNs;
		sax->endElementNs = endElementNs;
		sax->serror = serror;
	};
	return sax;
};

void xmlFreeMySAXHandler(xmlSAXHandlerPtr sax) {
	if (NULL != sax) {
		xmlFree(sax);
		sax = NULL;
	};
};

xmlParserInputPtr xmlCreateMyParserInput(
	xmlParserCtxtPtr parserCtxt,
	const char * content,
	int contentLen
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
				//inputBuffer->context = readContext;
			memset(parserInput, 0, sizeof(xmlParserInput));
			parserInput->line = 1;
			parserInput->col = 1;
			parserInput->standalone = -1;
			parserInput->buf = inputBuffer;
			if (parserCtxt != NULL) {
				parserInput->id = parserCtxt->input_id++;
			};
			xmlBufResetInput(parserInput->buf->buffer, parserInput);
			//inputPush(parserCtxt, parserInput);
				// TODO: Check "parserCtxt->inputMax"
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

void xmlFreeMyParserInput(xmlParserInputPtr parserInput) {
	if (NULL != parserInput) {
		if (NULL != parserInput->buf) {
			xmlFreeParserInputBuffer(parserInput->buf);
			parserInput->buf = NULL;
		};
		xmlFree(parserInput);
		parserInput = NULL;
	};
};

void * xmlGetUserDataFromParserCtxt(xmlParserCtxtPtr parserCtxt) {
	return parserCtxt->_private;
};
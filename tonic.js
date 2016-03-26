"use strict";

require('sax'); // Force load

const root = require('doodad-js').createRoot();

const modules = {};
require('doodad-js-io').add(modules);
require('doodad-js-xml').add(modules);

function startup() {
    const xml = root.Doodad.Tools.Xml;
    return xml.parse(
        "<songs><song><title>Another Me In Lack'ech</title><artist>Epica</artist></song><song><title>Silent Lucidity</title><artist>Queensryche</artist></song><song><title>One</title><artist>Metallica</artist></song></songs>"
    ).then(function(doc) {
        console.log(doc);
    });
};

root.Doodad.Namespaces.loadNamespaces( modules, startup )
    ['catch'](function(err) {
        console.error(err);
    });

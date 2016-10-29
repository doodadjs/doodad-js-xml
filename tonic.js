"use strict";

require('sax'); // Force load

const modules = {};
require('doodad-js-io').add(modules);
require('doodad-js-xml').add(modules);

require('doodad-js').createRoot(modules)
	.then(root => {
		const xml = root.Doodad.Tools.Xml;
		// NOTE: Random songs
		return xml.parse("<songs><song><title>Another Me In Lack'ech</title><artist>Epica</artist></song><song><title>Silent Lucidity</title><artist>Queensryche</artist></song><song><title>One</title><artist>Metallica</artist></song></songs>");
	})
	.then(doc => {
		console.log(doc);
    })
	.catch(err => {
        console.error(err);
    });
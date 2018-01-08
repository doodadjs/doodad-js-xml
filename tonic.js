require('@doodad-js/core').createRoot()
	.then(root => {
		return root.Doodad.Modules.load([
			{
				module: '@doodad-js/xml'
			}
		]);
	})
	.then(root => {
		const xml = root.Doodad.Tools.Xml;
		// NOTE: Random songs
		return xml.parse("<songs><song><title>Another Me In Lack'ech</title><artist>Epica</artist></song><song><title>Silent Lucidity</title><artist>Queensryche</artist></song><song><title>One</title><artist>Metallica</artist></song></songs>");
	}).then(doc => {
		const getItemValue = function(items, name) {
			return items.find(name)[0].getChildren().getAt(0).getValue();
		};
		for (let song of doc.getRoot().getChildren()) {
			const items = song.getChildren();
			console.log(getItemValue(items, 'title') + " from " + getItemValue(items, 'artist'));
		};
	}).catch(err => {
		console.error(err);
	});
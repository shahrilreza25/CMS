exports.install = function() {
	// COMMON
	FILE('/download/', file_read);
};


// Reads a specific file from database
// For images (jpg, gif, png) supports percentual resizing according "?s=NUMBER" argument in query string e.g.: .jpg?s=50, .jpg?s=80 (for image galleries)
// URL: /download/*.*
function file_read(req, res) {

	var id = req.split[1].replace('.' + req.extension, '');

	if (!req.query.s || (req.extension !== 'jpg' && req.extension !== 'gif' && req.extension !== 'png')) {
		// Reads specific file by ID
		F.exists(req, res, function(next, filename) {
			NOSQL('files').binary.read(id, function(err, stream) {

				if (err) {
					next();
					return res.throw404();
				}

				var writer = require('fs').createWriteStream(filename);

				CLEANUP(writer, function() {
					res.file(filename);
					next();
				});

				stream.pipe(writer);
			});
		});
		return;
	}

	// Custom image resizing
	var size;

	// Small hack for the file cache.
	// F.exists() uses req.uri.pathname for creating temp identificator and skips all query strings by creating (because this hack).
	if (req.query.s) {
		size = req.query.s.parseInt();
		req.uri.pathname = req.uri.pathname.replace('.', size + '.');
	}

	// Below method checks if the file exists (processed) in temporary directory
	// More information in total.js documentation
	F.exists(req, res, 10, function(next, filename) {

		// Reads specific file by ID
		NOSQL('files').binary.read(id, function(err, stream) {

			if (err) {
				next();
				return res.throw404();
			}

			var writer = require('fs').createWriteStream(filename);
			CLEANUP(writer, function() {

				// Releases F.exists()
				next();

				// Image processing
				res.image(filename, function(image) {
					image.output(req.extension);
					req.extension === 'jpg' && image.quality(85);
					size && image.resize(size + '%');
					image.minify();
				});
			});

			stream.pipe(writer);
		});
	});
}
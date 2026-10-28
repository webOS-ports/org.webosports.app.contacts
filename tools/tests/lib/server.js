/*
	Static file server for the app's checkout, on a free port, so tests do
	not depend on python or on a server someone left running.

		var server = await require("./lib/server.js").start(rootDir);
		server.url   // "http://127.0.0.1:<port>"
		await server.stop();
*/
var http = require("http");
var fs = require("fs");
var path = require("path");

var types = {
	".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
	".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
	".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
	".less": "text/plain; charset=utf-8"
};

function start(inRoot) {
	var root = path.resolve(inRoot);
	var server = http.createServer(function(req, res) {
		var file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
		// Never serve outside the checkout.
		if (file.indexOf(root) !== 0) {
			res.writeHead(403);
			res.end();
			return;
		}
		fs.stat(file, function(err, st) {
			if (!err && st.isDirectory()) {
				file = path.join(file, "index.html");
			}
			fs.readFile(file, function(err2, data) {
				if (err2) {
					res.writeHead(404);
					res.end("not found");
					return;
				}
				res.writeHead(200, {"Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
					"Cache-Control": "no-store"});
				res.end(data);
			});
		});
	});
	return new Promise(function(resolve) {
		server.listen(0, "127.0.0.1", function() {
			resolve({
				url: "http://127.0.0.1:" + server.address().port,
				stop: function() {
					return new Promise(function(r) { server.close(r); });
				}
			});
		});
	});
}

module.exports = {start: start};

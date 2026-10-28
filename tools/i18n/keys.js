// keys.js - the strings the app translates - LuneOS Contacts app
//
// Every $L("...") literal in src/, and the labels the pure modules give
// views to translate (labels.texts(), details.TEXTS). $L of anything but a
// literal is allowed only where those labels go through it (DYNAMIC).
//
//   node tools/i18n/keys.js           prints them, one JSON string a line
//   require("./keys").keys(root)      {keys: [...], problems: [...]}

var fs = require("fs"), path = require("path");

// file -> the non-literal $L arguments it may use
var DYNAMIC = {
	"src/views/ContactDetails.js": ["label"],
	"src/views/EditContact.js": ["inChoice.label"]
};

function walk(inDir, inOut) {
	fs.readdirSync(inDir).forEach(function(inName) {
		var p = path.join(inDir, inName);
		if (fs.statSync(p).isDirectory()) {
			walk(p, inOut);
		} else if (/\.js$/.test(inName)) {
			inOut.push(p);
		}
	});
	return inOut;
}

function keys(inRoot) {
	var found = {}, problems = [];
	walk(path.join(inRoot, "src"), []).forEach(function(inFile) {
		var rel = path.relative(inRoot, inFile).split(path.sep).join("/"), text = fs.readFileSync(inFile, "utf8"), m;
		var call = /\$L\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^)]*)\s*\)/g;
		while ((m = call.exec(text))) {
			var arg = m[1].trim();
			if (/^"/.test(arg)) {
				found[JSON.parse(arg)] = true;
			} else if (/^'/.test(arg)) {
				problems.push(rel + ": single-quoted $L string " + arg);
			} else if ((DYNAMIC[rel] || []).indexOf(arg) < 0) {
				problems.push(rel + ": $L(" + arg + ") is not a string literal");
			}
		}
	});
	require(path.join(inRoot, "src/util/labels.js")).texts().forEach(function(inText) { found[inText] = true; });
	var texts = require(path.join(inRoot, "src/util/details.js")).TEXTS;
	Object.keys(texts).forEach(function(inKey) { found[texts[inKey]] = true; });
	return {keys: Object.keys(found).sort(), problems: problems};
}

module.exports = {keys: keys};

if (require.main === module) {
	var r = keys(path.join(__dirname, "../.."));
	r.keys.forEach(function(inKey) { console.log(JSON.stringify(inKey)); });
	r.problems.forEach(function(inP) { console.error(inP); });
	process.exitCode = r.problems.length ? 1 : 0;
}

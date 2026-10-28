// l10n.js - translation tables - LuneOS Contacts app
//
// The strings are the English ones the app wraps in $L; resources/<language>/
// strings.json maps each to its translation, {name} placeholders kept.
//
// Pure module: no Enyo, so it is unit tested under Node.

//* The language of a locale, whatever its form ("de", "de-DE", "de_de", "de-Latn-DE"); "" for none.
function language(inLocale) {
	var l = String(inLocale || "").trim().toLowerCase().split(/[-_]/)[0];
	return /^[a-z]{2,3}$/.test(l) ? l : "";
}

//* A BCP 47 tag for Intl from a locale of either form: "de_de" -> "de-DE"; "" for none.
function tag(inLocale) {
	var parts = String(inLocale || "").trim().split(/[-_]/), l = language(inLocale);
	if (!l) {
		return "";
	}
	var region = parts.length > 1 ? parts[parts.length - 1] : "";
	return /^[a-zA-Z]{2}$/.test(region) ? l + "-" + region.toUpperCase() : l;
}

/**
	A $L for a table: its translation of a string, else the string itself.
	Only a non-empty string is a translation, which also leaves out what
	every object inherits ("toString").
*/
function translator(inTable) {
	var table = inTable && typeof inTable === "object" ? inTable : {};
	return function(inString) {
		var t = table[inString];
		return typeof t === "string" && t ? t : inString;
	};
}

//* The {name} placeholders of a string, sorted.
function placeholders(inString) {
	return (String(inString).match(/\{[a-zA-Z]+\}/g) || []).sort();
}

module.exports = {language: language, tag: tag, translator: translator, placeholders: placeholders};

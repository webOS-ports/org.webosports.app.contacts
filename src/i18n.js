// i18n.js - the app's translations - LuneOS Contacts app
//
// Loaded before anything else (see index.js): views translate their
// strings as their modules load. The system's UI locale
// (PalmSystem.locale, the settings' localeInfo.locales.UI) picks
// resources/<language>/strings.json, read synchronously as enyo-ilib does,
// and $L translates from it. English, or a language without a file, keeps
// the strings as they are. A locale change takes effect at the next launch.

var
	$L = require('enyo/i18n').$L,
	l10n = require('./util/l10n');

var LANGUAGES = ["de", "es", "fr", "it"];

var locale = (window.PalmSystem && window.PalmSystem.locale) || (window.navigator && window.navigator.language) || "";
var i18n = {
	language: l10n.language(locale),
	tag: l10n.tag(locale),
	translated: false,
	/**
		A stored date's parts as the locale writes them (year null for a
		date without one), for details.dateText; null in English, whose
		own format is the legacy app's.
	*/
	formatDate: null
};

function load(inLanguage) {
	try {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "resources/" + inLanguage + "/strings.json", false);
		xhr.send();
		if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
			return JSON.parse(xhr.responseText);
		}
		console.error("i18n: no strings for " + inLanguage + " (" + xhr.status + ")");
	} catch (e) {
		console.error("i18n: strings for " + inLanguage + " not loaded:", e.message);
	}
	return null;
}

if (LANGUAGES.indexOf(i18n.language) >= 0) {
	var table = load(i18n.language);
	if (table) {
		var translate = l10n.translator(table);
		$L.extend(function () {
			return translate;
		});
		i18n.translated = true;
	}
	try {
		var full = new Intl.DateTimeFormat(i18n.tag, {year: "numeric", month: "long", day: "numeric", timeZone: "UTC"});
		var dayMonth = new Intl.DateTimeFormat(i18n.tag, {month: "long", day: "numeric", timeZone: "UTC"});
		i18n.formatDate = function (inYear, inMonth, inDay) {
			var d = new Date(Date.UTC(2000, inMonth - 1, inDay));
			if (inYear !== null) {
				d.setUTCFullYear(inYear);
			}
			return (inYear === null ? dayMonth : full).format(d);
		};
	} catch (e) {
		console.error("i18n: no date format for " + i18n.tag + ":", e.message);
	}
}

module.exports = i18n;

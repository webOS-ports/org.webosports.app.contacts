// search.js - what a person is found by in the list - LuneOS Contacts app
//
// The legacy list searched db8's searchProperty with collate "primary":
// word starts, case and accents ignored. The same here, in memory: a
// person's terms are the words of its names, nickname, company, the user
// part of its email and IM addresses; every word of the query must start
// one of them ("anna berg", "zoe" for "Zoë"). A query of digits also
// finds phone numbers that contain them, as the Phone app's lookup does.
//
// Pure module: no Enyo, so it is unit tested under Node.

// Combining marks, which fold() takes off: "é" -> "e".
var MARKS = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g;

function str(inValue) {
	return typeof inValue === "string" ? inValue : "";
}

//* Lower case without accents.
function fold(inText) {
	var s = str(inText);
	if (s.normalize) {
		s = s.normalize("NFD").replace(MARKS, "");
	}
	return s.toLowerCase().replace(/ß/g, "ss").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ł/g, "l");
}

// Words: split at spaces, hyphens, dots, slashes and the like; a CJK run
// is a word too, and so is each character of it, since CJK names have no
// spaces between the parts.
function words(inText) {
	var out = [];
	fold(inText).split(/[\s\-._\/,;:()'"&+@]+/).forEach(function(inW) {
		if (inW) {
			out.push(inW);
		}
	});
	return out;
}

/**
	The search terms of a person record: an array of folded words, without
	duplicates.
*/
function terms(inPerson) {
	var p = inPerson || {}, set = {}, out = [];
	function add(inText) {
		words(inText).forEach(function(inW) {
			if (!set[inW]) {
				set[inW] = true;
				out.push(inW);
			}
		});
	}
	var names = (Array.isArray(p.names) ? p.names : []).concat(p.name ? [p.name] : []);
	names.forEach(function(inN) {
		if (inN && typeof inN === "object") {
			add(inN.givenName);
			add(inN.middleName);
			add(inN.familyName);
			// A CJK name is written without spaces: 李小龙.
			add(str(inN.familyName) + str(inN.givenName));
		}
	});
	add(p.nickname);
	add(p.organization && p.organization.name);
	["emails", "ims"].forEach(function(inField) {
		(Array.isArray(p[inField]) ? p[inField] : []).forEach(function(inE) {
			var v = inE && str(inE.value);
			add(v && v.split("@")[0]);
		});
	});
	return out;
}

//* The digits of a person's phone numbers, one string per number.
function digits(inPerson) {
	return (Array.isArray((inPerson || {}).phoneNumbers) ? inPerson.phoneNumbers : []).map(function(inE) {
		return str(inE && inE.value).replace(/\D/g, "");
	}).filter(function(inD) {
		return inD.length > 0;
	});
}

/**
	True when a person with the search terms inTerms and phone digits
	inDigits is found by inQuery. An empty query finds everyone.
*/
function matches(inTerms, inDigits, inQuery) {
	var query = str(inQuery).trim();
	if (!query) {
		return true;
	}
	var queryDigits = query.replace(/[\s\-.()+]/g, "");
	if (/^\d{3,}$/.test(queryDigits) && (inDigits || []).some(function(inD) { return inD.indexOf(queryDigits) >= 0; })) {
		return true;
	}
	var wanted = words(query);
	return wanted.length > 0 && wanted.every(function(inW) {
		return (inTerms || []).some(function(inT) {
			return inT.indexOf(inW) === 0;
		});
	});
}

module.exports = {fold: fold, terms: terms, digits: digits, matches: matches};

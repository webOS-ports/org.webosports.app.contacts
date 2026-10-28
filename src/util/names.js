// names.js - formats and parses personal names - LuneOS Contacts app
//
// The rules follow the legacy webOS globalization framework
// (Globalization.Name.parsePersonalName): titles and honorifics are taken
// off the front, suffixes off the back, family-name particles ("van der",
// "von", "de la") stay with the family name, one word is a given name, and
// the words between the first and the last are middle names. A name written
// in CJK script without spaces is family name first.
//
// Pure module: no Enyo, so it is unit tested under Node.

// Lower case, without dots and commas. A union of the legacy en, de, nl,
// fr, es and it tables, minus the entries that are also common words
// ("the", "and", "der", "la", ...), which would eat real names.
var PREFIXES = [
	"mr", "mrs", "ms", "mx", "miss", "mister", "madam", "madame", "sir", "lady", "lord", "dame",
	"dr", "doctor", "prof", "professor", "rev", "reverend", "fr", "father", "sister", "brother",
	"the hon", "the honourable", "the honorable", "hon", "rabbi", "imam", "pastor",
	"herr", "hr", "frau", "fräulein", "frl", "doktor", "dipl-ing", "ing",
	"dhr", "mevr", "mw", "meneer", "mevrouw", "drs", "ir", "mr", "jhr", "ds",
	"m", "mme", "mlle", "monsieur", "mademoiselle", "maître", "docteur",
	"don", "doña", "sr", "sra", "srta", "señor", "señora", "señorita",
	"sig", "signor", "signore", "signora", "signorina", "dott", "dottore", "dottoressa", "avv", "avvocato"
];
var SUFFIXES = [
	"jr", "junior", "sr", "senior", "ii", "iii", "iv", "v", "vi", "2nd", "3rd", "4th",
	"esq", "esquire", "phd", "md", "jd", "dds", "dmd", "msc", "bsc", "ba", "ma", "mba", "llb", "llm",
	"ret", "retired", "hijo"
];
// Particles that belong to the family name, longest first.
var PARTICLES = [
	"von und zu", "van de", "van der", "van den", "van het", "van 't", "von der", "von den", "de la",
	"de los", "de las", "op de", "in de", "in 't", "van", "von", "vom", "zu", "zum", "zur", "der", "den",
	"de", "del", "della", "dalla", "di", "da", "du", "des", "le", "la", "lo", "les", "do", "dos",
	"ter", "ten", "te", "'t", "het", "mac", "mc", "bin", "ben", "ibn", "abu", "al", "el", "bar"
];
var CONJUNCTIONS = ["and", "or", "&", "+", "und", "en", "et", "y", "e"];

var CJK = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿]/;
var CJK_ONLY = /^[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿\s]+$/;

function clean(inWord) {
	return inWord.toLowerCase().replace(/[.,]/g, "");
}

function str(inValue) {
	return typeof inValue === "string" ? inValue.trim() : "";
}

/**
	The full name for display: "Dr. Mary Ann Smith-Jones, PhD". Parts that
	are missing are left out; a CJK family and given name are joined without
	a space, family name first.
*/
function format(inName) {
	var n = inName || {}, prefix = str(n.honorificPrefix), given = str(n.givenName),
		middle = str(n.middleName), family = str(n.familyName), suffix = str(n.honorificSuffix), out;
	if (CJK.test(family + given) && CJK_ONLY.test(family + given) && !middle) {
		out = family + given;
		out = prefix ? prefix + " " + out : out;
	} else {
		out = [prefix, given, middle, family].filter(function(inP) { return inP; }).join(" ");
	}
	if (suffix) {
		out += (/^[,\s]/.test(n.honorificSuffix) ? n.honorificSuffix.replace(/\s+$/, "") : (out ? ", " : "") + suffix);
	}
	return out;
}

// Takes titles and honorifics off the front (possibly several: "Prof. Dr.")
// and suffixes off the back, always leaving at least one word.
function splitAffixes(inWords) {
	var words = inWords.filter(function(inW) { return inW; }), prefixes = [], suffixes = [];
	while (words.length > 1 && PREFIXES.indexOf(clean(words[0])) >= 0) {
		prefixes.push(words.shift());
	}
	while (words.length > 1 && SUFFIXES.indexOf(clean(words[words.length - 1])) >= 0) {
		suffixes.unshift(words.pop());
	}
	return {prefixes: prefixes, words: words, suffixes: suffixes};
}

// Joins particle words to the word after them, so "van der Berg" is one part.
function adjoinParticles(inParts) {
	var parts = inParts.slice(), start, len, phrase;
	for (start = 0; start < parts.length - 1; start++) {
		for (len = Math.min(3, parts.length - 1 - start); len > 0; len--) {
			phrase = clean(parts.slice(start, start + len).join(" "));
			// A particle word is lower case as written; "Van Morrison" is a given name.
			if (PARTICLES.indexOf(phrase) >= 0 && parts[start] === parts[start].toLowerCase()) {
				parts.splice(start, len + 1, parts.slice(start, start + len + 1).join(" "));
				break;
			}
		}
	}
	return parts;
}

/**
	Parses a name typed as one line into {honorificPrefix, givenName,
	middleName, familyName, honorificSuffix}; every field is a string.
	"Family, Given Middle" is understood too.
*/
function parse(inText) {
	var name = {honorificPrefix: "", givenName: "", middleName: "", familyName: "", honorificSuffix: ""},
		text = str(inText).replace(/\s+/g, " "), parts, i, comma, prefixes, suffixes, rest;
	if (!text) {
		return name;
	}

	if (CJK_ONLY.test(text)) {
		parts = text.split(" ");
		if (parts.length >= 2) {
			name.familyName = parts[0];
			name.givenName = parts.slice(1).join("");
		} else if (text.length > 1) {
			name.familyName = text.charAt(0);
			name.givenName = text.slice(1);
		} else {
			name.givenName = text;
		}
		return name;
	}

	// "Smith, Jr." and "Smith, PhD" are suffixes; "Smith, John" is family-first.
	comma = text.indexOf(",");
	if (comma > 0) {
		rest = text.slice(comma + 1).replace(/,/g, " ").trim();
		if (rest && !rest.split(" ").every(function(inW) { return SUFFIXES.indexOf(clean(inW)) >= 0; })) {
			var familyPart = splitAffixes(text.slice(0, comma).trim().split(" ")),
				givenPart = splitAffixes(rest.split(" "));
			name.honorificPrefix = familyPart.prefixes.concat(givenPart.prefixes).join(" ");
			name.honorificSuffix = familyPart.suffixes.concat(givenPart.suffixes).join(" ");
			name.familyName = familyPart.words.join(" ");
			name.givenName = givenPart.words[0] || "";
			name.middleName = givenPart.words.slice(1).join(" ");
			return name;
		}
	}

	parts = text.replace(/,/g, " ").replace(/\s+/g, " ").trim().split(" ");

	var affixes = splitAffixes(parts);
	parts = affixes.words;
	prefixes = affixes.prefixes;
	suffixes = affixes.suffixes;
	name.honorificPrefix = prefixes.join(" ");
	name.honorificSuffix = suffixes.join(" ");

	parts = adjoinParticles(parts);
	if (!parts.length) {
		return name;
	}

	if (parts.length === 1) {
		// "Dr. Roberts" and "van Dyke" are family names; "Anna" is a given name.
		if (prefixes.length || parts[0].indexOf(" ") > 0) {
			name.familyName = parts[0];
		} else {
			name.givenName = parts[0];
		}
		return name;
	}

	// "John and Mary Smith": everything up to the word after the last
	// conjunction is the given name.
	for (i = parts.length - 2; i > 0; i--) {
		if (CONJUNCTIONS.indexOf(parts[i].toLowerCase()) >= 0) {
			name.givenName = parts.slice(0, i + 2).join(" ");
			name.middleName = parts.slice(i + 2, parts.length - 1).join(" ");
			name.familyName = i + 2 < parts.length ? parts[parts.length - 1] : "";
			return name;
		}
	}

	name.givenName = parts[0];
	name.middleName = parts.slice(1, parts.length - 1).join(" ");
	name.familyName = parts[parts.length - 1];
	return name;
}

//* True when two structured names have the same parts (missing = "").
function equal(inA, inB) {
	var a = inA || {}, b = inB || {};
	return ["honorificPrefix", "givenName", "middleName", "familyName", "honorificSuffix"].every(function(inK) {
		return str(a[inK]) === str(b[inK]);
	});
}

function firstValue(inList) {
	var list = Array.isArray(inList) ? inList : [];
	for (var i = 0; i < list.length; i++) {
		if (list[i] && str(list[i].value)) {
			return str(list[i].value);
		}
	}
	return "";
}

/**
	The name a person record is listed by, as the legacy
	Person.generateDisplayNameFromRawPerson made it: the full name, else
	the nickname, else "title, company", else the first email, IM address
	or phone number. "" when there is nothing (the view shows
	"[No Name Available]").
*/
function displayName(inPerson) {
	var p = inPerson || {}, org = (p.organization && typeof p.organization === "object") ? p.organization : {};
	var title = str(org.title), company = str(org.name);
	return format(p.name) || str(p.nickname).trim() ||
		[title, company].filter(function(inP) { return inP; }).join(", ") ||
		firstValue(p.emails) || firstValue(p.ims) || firstValue(p.phoneNumbers);
}

// Letters and digits of every script, for the divider of a sort key.
var LETTER = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-׿؀-ۿ぀-ヿ㐀-䶿一-鿿가-힯]/;
var NO_SORT_KEY = "𧻓";   // SortKey.DEFAULT_CHAR: sorts after every letter

/**
	The divider a person is listed under, as the legacy PersonList's
	getGroupName: the first letter of the sort key, without its accent and
	in upper case; for the company orders the first letter of the company.
	"#" when the person has none (the sort key starts with
	SortKey.DEFAULT_CHAR).
*/
function dividerText(inPerson, inSortOrder) {
	var p = inPerson || {}, key = str(p.sortKey), text;
	if (!key || key.charAt(0) === NO_SORT_KEY || key.charAt(0) === "￿") {
		return "#";
	}
	text = /^COMPANY/.test(str(inSortOrder)) ? str(p.organization && p.organization.name).trim() : key;
	text = text.normalize ? text.normalize("NFD") : text;
	var first = text.charAt(0);
	return first && LETTER.test(first) ? first.toUpperCase() : "#";
}

module.exports = {format: format, parse: parse, equal: equal, displayName: displayName, dividerText: dividerText};

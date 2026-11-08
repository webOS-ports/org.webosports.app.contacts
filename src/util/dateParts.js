// dateParts.js - a stored date as the date dialog's month, day and year - LuneOS Contacts app
//
// Contacts store a date as "YYYY-MM-DD", or without a year as "--MM-DD"
// (vCard's form, also "--MMDD"). The edit view's date dialog picks the
// parts; these turn one into the other.

function str(inValue) {
	return inValue === undefined || inValue === null ? "" : String(inValue);
}

function pad(inN) {
	return (inN < 10 ? "0" : "") + inN;
}

/**
	The parts of a stored date: {year (null when none), month 1-12, day},
	or null when it is not such a date.
*/
function parse(inValue) {
	var v = str(inValue).trim(), m, year = null, month, day;
	if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(v))) {
		year = +m[1];
		month = +m[2];
		day = +m[3];
	} else if ((m = /^--(\d{2})-?(\d{2})$/.exec(v))) {
		month = +m[1];
		day = +m[2];
	} else {
		return null;
	}
	if (month < 1 || month > 12 || day < 1 || day > monthLength(year, month)) {
		return null;
	}
	return {year: year, month: month, day: day};
}

//* The parts as stored: "YYYY-MM-DD", or "--MM-DD" without a year.
function format(inParts) {
	return (inParts.year === null ? "-" : String(inParts.year)) + "-" + pad(inParts.month) + "-" + pad(inParts.day);
}

//* The days in inMonth (1-12) of inYear; February has 29 without a year.
function monthLength(inYear, inMonth) {
	if (inMonth === 2) {
		var y = inYear === null ? 2000 : inYear;
		return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
	}
	return [4, 6, 9, 11].indexOf(inMonth) >= 0 ? 30 : 31;
}

/**
	The order the locale inTag writes a date's parts in, as
	["month", "day", "year"]; that order when the locale gives none.
*/
function order(inTag) {
	var out = [];
	try {
		new Intl.DateTimeFormat(inTag || undefined, {year: "numeric", month: "short", day: "numeric", timeZone: "UTC"})
			.formatToParts(new Date(Date.UTC(2000, 10, 22))).forEach(function (inPart) {
				if (["month", "day", "year"].indexOf(inPart.type) >= 0 && out.indexOf(inPart.type) < 0) {
					out.push(inPart.type);
				}
			});
	} catch (e) {
		out = [];
	}
	return out.length === 3 ? out : ["month", "day", "year"];
}

//* The month names the locale inTag abbreviates to ("Jan" ... "Dec").
function monthNames(inTag) {
	var out = [];
	try {
		var f = new Intl.DateTimeFormat(inTag || undefined, {month: "short", timeZone: "UTC"});
		for (var i = 0; i < 12; i++) {
			out.push(f.format(new Date(Date.UTC(2000, i, 1))));
		}
	} catch (e) {
		out = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	}
	return out;
}

module.exports = {parse: parse, format: format, monthLength: monthLength, order: order, monthNames: monthNames};

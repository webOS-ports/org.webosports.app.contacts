// details.js - the rows of a person's details, and what tapping them opens -
// LuneOS Contacts app
//
// Every value is plain text (the view never renders it as markup), and
// every link is built here from an allowed scheme only: contact data comes
// from sync accounts, vCards and other apps, so it is not trusted. The
// schemes are the ones luna-init hands to apps
// (command-resource-handlers.json): tel: and sms: (Phone, Messaging),
// mailto: (Email), maploc: (Maps), im: (Messaging), http(s): (browser).
//
// Pure module: no Enyo, so it is unit tested under Node.

var labels = require("./labels");
var accountRules = require("./accountRules");

function str(inValue) {
	return typeof inValue === "string" ? inValue : (typeof inValue === "number" ? String(inValue) : "");
}

// Types a text message cannot go to.
var NO_SMS = ["type_work_fax", "type_personal_fax", "type_fax", "type_pager"];

var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
	"November", "December"];

/**
	An address as lines: street, then postal code and city, then region,
	then country. Missing parts are left out, never shown as "undefined".
*/
function addressText(inAddress) {
	var a = inAddress || {}, lines = [];
	var street = str(a.streetAddress).trim();
	var city = [str(a.postalCode).trim(), str(a.locality).trim()].filter(function(inP) { return inP; }).join(" ");
	[street, city, str(a.region).trim(), str(a.country).trim()].forEach(function(inLine) {
		if (inLine) {
			lines.push(inLine);
		}
	});
	return lines.join("\n");
}

/**
	A stored date for display: "1980-03-14" -> "March 14, 1980", a date
	without a year ("--07-04", as vCards have) -> "July 4". Anything else
	is shown as it is.
*/
function dateText(inValue, inMonths) {
	var v = str(inValue).trim(), months = inMonths || MONTHS, m;
	m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
	if (m && +m[2] >= 1 && +m[2] <= 12) {
		return months[+m[2] - 1] + " " + (+m[3]) + ", " + m[1];
	}
	m = /^--(\d{2})-?(\d{2})$/.exec(v);
	if (m && +m[1] >= 1 && +m[1] <= 12) {
		return months[+m[1] - 1] + " " + (+m[2]);
	}
	return v;
}

/**
	The next time a stored date comes round, at noon local time, from
	inNow (a Date): for opening the calendar on a birthday. null when the
	value is not a date.
*/
function nextOccurrence(inValue, inNow) {
	var v = str(inValue).trim(), m = /^(?:\d{4}|-)-(\d{2})-(\d{2})/.exec(v) || /^--(\d{2})(\d{2})$/.exec(v);
	if (!m) {
		return null;
	}
	var month = +m[1] - 1, day = +m[2], now = inNow || new Date();
	if (month < 0 || month > 11 || day < 1 || day > 31) {
		return null;
	}
	var next = new Date(now.getFullYear(), month, day, 12);
	if (next.getMonth() !== month) {
		// February 29 in a year without one.
		next = new Date(now.getFullYear(), month + 1, 1, 12);
	}
	var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (next < today) {
		next = new Date(now.getFullYear() + 1, month, day, 12);
	}
	return next;
}

// The characters a phone number is dialled with.
function dialString(inNumber) {
	return str(inNumber).replace(/[^0-9+*#,;pPwW]/g, "");
}

/**
	A web address to open: http and https only; a bare host ("www.x.org")
	gets http://. null for anything else (javascript:, data:, file:, ...).
*/
function webUrl(inValue) {
	var v = str(inValue).trim();
	if (!v || /[\s<>"]/.test(v)) {
		return null;
	}
	if (/^https?:\/\/[^\/]/i.test(v)) {
		return v;
	}
	if (/^[a-z][a-z0-9+.\-]*:/i.test(v)) {
		return null;   // some other scheme
	}
	if (/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+(:\d+)?([\/?#].*)?$/i.test(v)) {
		return "http://" + v;
	}
	return null;
}

function emailUrl(inValue) {
	var v = str(inValue).trim();
	return /^[^\s@<>"(),;:\\\[\]]+@[^\s@<>"(),;:\\\[\]]+$/.test(v) ? "mailto:" + v : null;
}

/**
	The URL that tapping a row opens, or null when there is nothing safe to
	open. inRow is a row from rows().
*/
function target(inRow) {
	var v = inRow.value;
	switch (inRow.key) {
	case "phoneNumbers":
		return dialString(v) ? "tel:" + encodeURIComponent(dialString(v)) : null;
	case "emails":
		return emailUrl(v);
	case "urls":
		return webUrl(v);
	case "addresses":
		return v.trim() ? "maploc:" + encodeURIComponent(v.replace(/\n/g, ", ")) : null;
	default:
		return null;
	}
}

//* The sms: URL of a phone row, or null.
function smsTarget(inRow, inPersonId) {
	if (inRow.key !== "phoneNumbers" || !dialString(inRow.value)) {
		return null;
	}
	return "sms:" + encodeURIComponent(dialString(inRow.value)) +
		(inPersonId ? "?personId=" + encodeURIComponent(inPersonId) : "");
}

/**
	What tapping an IM address can do, in order: always "chat" (Messaging
	handles every IM type), "voice" when an account's PHONE provider serves
	the type (Skype's serves "type_skype"), and "video" when that provider
	says it has video (videoFormat other than "none"). Each is
	{action, transport}: transport is the calling account's templateId, as
	the legacy app passed it to the Phone app.
*/
function imActions(inType, inAccounts) {
	var out = [{action: "chat", transport: ""}];
	if (!inType) {
		return out;
	}
	var phone = accountRules.providersFor(inAccounts, "PHONE", inType)[0];
	if (phone) {
		out.push({action: "voice", transport: phone.account.templateId || ""});
		if (phone.provider.videoFormat && phone.provider.videoFormat !== "none") {
			out.push({action: "video", transport: phone.account.templateId || ""});
		}
	}
	return out;
}

/**
	The im: URL that opens a chat with an IM address in Messaging, or null
	when the value is not an address.
*/
function imTarget(inValue, inType, inPersonId) {
	var match = /^([^@\s]+)(@([^@\s]+))?$/.exec(str(inValue).trim()), url, type;
	if (!match) {
		return null;
	}
	url = "im:" + encodeURIComponent(match[1]) + (match[3] ? "@" + encodeURIComponent(match[3]) : "");
	url += "?personId=" + encodeURIComponent(str(inPersonId));
	type = str(inType).replace(/^type_/, "");
	if (type && type !== "other") {
		url += "&type=" + encodeURIComponent(type);
	}
	return url;
}

/**
	The detail rows of a person record, in the legacy order: phone numbers,
	emails, IMs, addresses, web addresses, notes, birthday, anniversary,
	relations. Each row is {key, type, label, value, sms, entry}: label and
	value are plain text (labels in English, for $L), entry the stored one.
*/
function rows(inPerson) {
	var p = inPerson || {}, out = [];
	function list(inKey) {
		(Array.isArray(p[inKey]) ? p[inKey] : []).forEach(function(inE) {
			if (!inE || typeof inE !== "object") {
				return;
			}
			var value = inKey === "addresses" ? addressText(inE) : str(inE.value).trim();
			if (!value) {
				return;
			}
			out.push({key: inKey, type: str(inE.type), label: labels.label(inKey, inE.type, inE.label), value: value,
				sms: inKey === "phoneNumbers" && NO_SMS.indexOf(inE.type) < 0, entry: inE});
		});
	}
	list("phoneNumbers");
	list("emails");
	list("ims");
	list("addresses");
	list("urls");
	(Array.isArray(p.notes) ? p.notes : [p.notes]).forEach(function(inNote) {
		if (str(inNote).trim()) {
			out.push({key: "notes", type: "", label: "Note", value: str(inNote).replace(/\s+$/, ""), sms: false, entry: null});
		}
	});
	[["birthday", "Birthday"], ["anniversary", "Anniversary"]].forEach(function(inPair) {
		if (str(p[inPair[0]]).trim()) {
			out.push({key: inPair[0], type: "", label: inPair[1], value: dateText(p[inPair[0]]), date: str(p[inPair[0]]).trim(),
				sms: false, entry: null});
		}
	});
	list("relations");
	return out;
}

module.exports = {rows: rows, target: target, smsTarget: smsTarget, imActions: imActions, imTarget: imTarget, addressText: addressText, dateText: dateText,
	nextOccurrence: nextOccurrence, webUrl: webUrl, dialString: dialString, MONTHS: MONTHS};

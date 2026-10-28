// presence.js - IM buddy presence - LuneOS Contacts app
//
// The IM connectors keep each buddy's presence in tempdb's
// com.palm.imbuddystatus:1 kind: {username, serviceName, availability}. The
// availability values are the legacy IMAddress.STATUS / imlibpurple
// PalmAvailability ones. As the legacy ImAddressStatusWatcher, an address
// on several accounts shows its "most online" (lowest) availability.
// Usernames are matched without regard to case: a connector and a synced
// contact do not always agree on it.
//
// Pure module: no Enyo, so it is unit tested under Node.

var AVAILABILITY = {ONLINE: 0, MOBILE: 1, IDLE: 2, INVISIBLE: 3, OFFLINE: 4, PENDING: 5, NO_PRESENCE: 6};

function key(inServiceName, inUsername) {
	return inServiceName + "|" + String(inUsername).toLowerCase();
}

/**
	An index of buddy status records: {"serviceName|username": availability},
	the lowest availability of each address. Records without a username,
	serviceName or numeric availability are left out.
*/
function index(inBuddies) {
	var out = {};
	(Array.isArray(inBuddies) ? inBuddies : []).forEach(function(inB) {
		if (!inB || typeof inB.username !== "string" || !inB.username || typeof inB.serviceName !== "string" ||
				!inB.serviceName || typeof inB.availability !== "number") {
			return;
		}
		var k = key(inB.serviceName, inB.username);
		if (out[k] === undefined || inB.availability < out[k]) {
			out[k] = inB.availability;
		}
	});
	return out;
}

//* The availability of one IM address ({value, type}), NO_PRESENCE when unknown.
function ofAddress(inIndex, inIm) {
	if (!inIm || typeof inIm.value !== "string" || typeof inIm.type !== "string") {
		return AVAILABILITY.NO_PRESENCE;
	}
	var a = (inIndex || {})[key(inIm.type, inIm.value.trim())];
	return a === undefined ? AVAILABILITY.NO_PRESENCE : a;
}

//* The best availability of all of a person's IM addresses.
function ofPerson(inIndex, inPerson) {
	return ((inPerson && Array.isArray(inPerson.ims)) ? inPerson.ims : []).reduce(function(inBest, inIm) {
		return Math.min(inBest, ofAddress(inIndex, inIm));
	}, AVAILABILITY.NO_PRESENCE);
}

/**
	The CSS class of an availability, as the legacy getImStatusClassName,
	"" for none shown. MOBILE (which imlibpurple writes and the legacy
	framework did not know) counts as available, INVISIBLE as offline.
*/
function className(inAvailability) {
	switch (inAvailability) {
	case AVAILABILITY.ONLINE:
	case AVAILABILITY.MOBILE:
		return "status-available";
	case AVAILABILITY.IDLE:
		return "status-busy";
	case AVAILABILITY.INVISIBLE:
	case AVAILABILITY.OFFLINE:
		return "status-offline";
	default:
		return "";
	}
}

module.exports = {AVAILABILITY: AVAILABILITY, index: index, ofAddress: ofAddress, ofPerson: ofPerson, className: className};

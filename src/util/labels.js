// labels.js - the types of contact points and their labels - LuneOS Contacts app
//
// Types are the db8 values ("type_mobile"); labels are English, and views
// pass them through $L. `choices` are what a type picker offers, as in the
// legacy app; a record's own type is offered too when it is not one of them
// (see choicesFor), so editing never changes a type behind the user's back.
//
// Pure module: no Enyo, so it is unit tested under Node.

var LABELS = {
	phoneNumbers: {
		type_mobile: "Mobile", type_home: "Home", type_home2: "Home 2", type_work: "Work", type_work2: "Work 2",
		type_main: "Main", type_work_fax: "Work fax", type_personal_fax: "Home fax", type_pager: "Pager",
		type_personal: "Personal", type_sim: "SIM", type_assistant: "Assistant", type_car: "Car",
		type_radio: "Radio", type_company: "Company", type_other: "Other"
	},
	emails: {type_home: "Home", type_work: "Work", type_other: "Other"},
	addresses: {type_home: "Home", type_work: "Work", type_other: "Other"},
	urls: {
		type_homepage: "Home page", type_home: "Home", type_work: "Work", type_blog: "Blog", type_ftp: "FTP",
		type_profile: "Profile", type_other: "Other"
	},
	ims: {
		type_aim: "AIM", type_gadugadu: "Gadu-Gadu", type_gtalk: "Google Talk", type_icq: "ICQ",
		type_jabber: "Jabber / XMPP", type_sametime: "Lotus Sametime", type_groupwise: "Novell GroupWise",
		type_qq: "QQ", type_whatsapp: "WhatsApp", type_yahoo: "Yahoo", type_msn: "Windows Live",
		type_bbm: "BlackBerry Messenger", type_facebook: "Facebook", type_imessage: "iMessage", type_imo: "imo",
		type_irc: "IRC", type_kakaotalk: "KakaoTalk", type_line: "LINE", type_linkedin: "LinkedIn",
		type_signal: "Signal", type_silc: "SILC", type_silentphone: "Silent Phone", type_simple: "SIMPLE / LCS",
		type_lcs: "SIMPLE / LCS", type_skype: "Skype", type_snapchat: "Snapchat", type_telegram: "Telegram",
		type_threema: "Threema", type_twitter: "Twitter", type_viber: "Viber", type_wechat: "WeChat",
		type_zalo: "Zalo", type_zephyr: "Zephyr", type_yjp: "Yahoo! Japan", type_dotmac: ".Mac",
		type_myspace: "MySpace", type_default: "Other", type_other: "Other"
	},
	relations: {
		type_assistant: "Assistant", type_brother: "Brother", type_child: "Child",
		type_domestic_partner: "Domestic partner", type_father: "Father", type_friend: "Friend",
		type_manager: "Manager", type_mother: "Mother", type_parent: "Parent", type_partner: "Partner",
		type_referred_by: "Referred by", type_relative: "Relative", type_sister: "Sister",
		type_spouse: "Spouse", type_other: "Other"
	}
};

var CHOICES = {
	phoneNumbers: ["type_mobile", "type_home", "type_work", "type_main", "type_work_fax", "type_personal_fax", "type_pager", "type_other"],
	emails: ["type_home", "type_work", "type_other"],
	addresses: ["type_home", "type_work", "type_other"],
	urls: ["type_homepage", "type_work", "type_blog", "type_profile", "type_other"],
	ims: ["type_aim", "type_gtalk", "type_icq", "type_jabber", "type_qq", "type_signal", "type_skype", "type_telegram",
		"type_whatsapp", "type_yahoo", "type_irc", "type_facebook", "type_other"],
	relations: ["type_spouse", "type_partner", "type_child", "type_mother", "type_father", "type_parent",
		"type_sister", "type_brother", "type_relative", "type_friend", "type_assistant", "type_manager",
		"type_referred_by", "type_other"]
};

// The type a new entry starts with, as in the legacy app.
var DEFAULTS = {
	phoneNumbers: "type_mobile", emails: "type_home", addresses: "type_home", urls: "type_homepage",
	ims: "type_jabber", relations: "type_spouse"
};

/**
	The label of a type in a field ("phoneNumbers", "type_work_fax" ->
	"Work fax"). An unknown type_ value becomes readable ("type_foo_bar" ->
	"Foo bar"); a custom label on the entry (inLabel) wins when there is no
	known type.
*/
function label(inField, inType, inLabel) {
	var known = (LABELS[inField] || {})[inType];
	if (known) {
		return known;
	}
	if (inLabel && typeof inLabel === "string" && !/^label_/.test(inLabel)) {
		return inLabel;
	}
	if (typeof inType === "string" && inType) {
		var words = inType.replace(/^type_/, "").replace(/_/g, " ");
		return words.charAt(0).toUpperCase() + words.slice(1);
	}
	return "Other";
}

//* [{value, label}] for a type picker of inField, including inCurrentType.
function choicesFor(inField, inCurrentType) {
	var types = (CHOICES[inField] || []).slice();
	if (inCurrentType && types.indexOf(inCurrentType) < 0) {
		types.unshift(inCurrentType);
	}
	return types.map(function(inType) {
		return {value: inType, label: label(inField, inType)};
	});
}

function defaultType(inField) {
	return DEFAULTS[inField] || "type_other";
}

module.exports = {label: label, choicesFor: choicesFor, defaultType: defaultType, FIELDS: Object.keys(LABELS)};

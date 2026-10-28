// choose.js - selects an enyo/Select's option by value - LuneOS Contacts app

/**
	Selects the option of inValue. Select.set("value") does not work before
	the select is rendered: it falls back to the first option.
*/
module.exports = function choose(inSelect, inValue) {
	var options = inSelect.getClientControls();
	for (var i = 0; i < options.length; i++) {
		if (options[i].value === inValue) {
			inSelect.set("selected", i);
			return;
		}
	}
};

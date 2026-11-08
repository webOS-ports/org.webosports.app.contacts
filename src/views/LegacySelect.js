/* LegacySelect.js - a select that opens the legacy menu - org.webosports.app.contacts */

// An enyo/Select whose choices open in the webOS 3.0.5 menu (Enyo 1's
// ListSelector popup: a light rounded box, 44px rows, a check mark on the
// chosen one) instead of the browser's own select popup, which on the
// device is a small unstyled list with a yellow highlight.
//
// The <select> stays the real control: its value, its options, its change
// event and its keyboard handling work as before, so everything that reads
// or sets it does not change. Only the popup is ours.
var
	kind = require('enyo/kind'),
	Select = require('enyo/Select'),
	Control = require('enyo/Control'),
	Popup = require('enyo/Popup');

// Gap kept between the menu and the window's edges, in px.
var EDGE = 8;

// The menu, made on first use.
var menu = null;

var Menu = kind({
	name: "LegacySelectMenu",
	kind: Popup,
	classes: "legacy-menu",
	floating: true,
	modal: true,
	autoDismiss: true,
	//* The LegacySelect the menu is open for.
	target: null,
	components: [
		{name: "items", classes: "legacy-menu-items", attributes: {role: "listbox"}}
	],
	//* Fills the menu with inLabels; inChosen gets the check mark.
	setChoices: function (inLabels, inChosen) {
		this.$.items.destroyClientControls();
		inLabels.forEach(function (inLabel, inIndex) {
			this.$.items.createComponent({kind: Control, classes: "legacy-menu-item" +
					(inIndex === inChosen ? " checked" : "") +
					(inIndex === 0 ? " first" : "") +
					(inIndex === inLabels.length - 1 ? " last" : ""),
				content: inLabel, index: inIndex, ontap: "itemTap",
				attributes: {role: "option", "aria-selected": inIndex === inChosen ? "true" : "false"}
			}, {owner: this});
		}, this);
		if (this.hasNode()) {
			this.$.items.render();
		}
	},
	itemTap: function (inSender) {
		this.hide();
		if (this.target) {
			this.target.menuPick(inSender.index);
		}
		return true;
	},
	//* Opens next to inRect (the select's box): its right edge on the
	//* select's, its top on the select's, moved up so it fits the window.
	openAt: function (inRect) {
		this.applyStyle("visibility", "hidden");
		this.show();
		var node = this.hasNode();
		if (!node) {
			return;
		}
		var vw = window.innerWidth, vh = window.innerHeight;
		node.style.maxHeight = (vh - 2 * EDGE) + "px";
		node.style.maxWidth = (vw - 2 * EDGE) + "px";
		var w = node.offsetWidth, h = node.offsetHeight;
		var left = Math.min(Math.max(inRect.right - w, EDGE), vw - EDGE - w);
		var top = Math.min(Math.max(inRect.top - 4, EDGE), vh - EDGE - h);
		this.addStyles("left: " + Math.max(left, EDGE) + "px; top: " + Math.max(top, EDGE) + "px; right: auto; bottom: auto;");
		// The chosen row in view when the list scrolls.
		var checked = node.querySelector(".legacy-menu-item.checked");
		if (checked && node.scrollHeight > node.clientHeight) {
			node.scrollTop = Math.max(checked.offsetTop - (node.clientHeight - checked.offsetHeight) / 2, 0);
		}
		this.applyStyle("visibility", null);
	}
});

module.exports = kind({
	name: "LegacySelect",
	kind: Select,
	handlers: {
		ontap: "openMenu"
	},
	rendered: kind.inherit(function (sup) {
		return function () {
			sup.apply(this, arguments);
			var node = this.hasNode();
			if (node && !node._legacyMenu) {
				node._legacyMenu = true;
				// The browser opens its popup on the press: keep it shut.
				node.addEventListener("mousedown", function (e) {
					if (e.button === 0) {
						e.preventDefault();
					}
				});
				// The keys that would open the browser's popup open ours.
				node.addEventListener("keydown", function (e) {
					if (e.key === " " || e.key === "Enter" || e.key === "F4" ||
							(e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp"))) {
						e.preventDefault();
						this.openMenu();
					}
				}.bind(this));
			}
		};
	}),
	openMenu: function () {
		var node = this.hasNode();
		if (!node || this.disabled || node.disabled) {
			return true;
		}
		var labels = this.getClientControls().map(function (inOption) {
			return inOption.get("content");
		});
		if (!labels.length) {
			return true;
		}
		// One menu serves every select: one is open at a time.
		if (!menu) {
			menu = new Menu();
		}
		menu.target = this;
		menu.setChoices(labels, node.selectedIndex);
		menu.openAt(node.getBoundingClientRect());
		return true;
	},
	menuPick: function (inIndex) {
		var node = this.hasNode();
		if (node && inIndex !== node.selectedIndex) {
			this.set("selected", inIndex);
			// As if the user had picked it in the select itself.
			node.dispatchEvent(new Event("change", {bubbles: true}));
		}
		if (node) {
			node.focus();
		}
		return true;
	}
});

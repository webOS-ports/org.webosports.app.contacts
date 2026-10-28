// index.js - Contacts app for LuneOS
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var ready = require('enyo/ready'),
	Source = require('enyo/Source'),
	db8Source = require('./src/data/db8Source'),
	ContactsApplication = require('./src/ContactsApplication');


ready(function() {
	if (!window.PalmSystem) {
		// Desktop browsers: dist/debug.html loads mock/luna-bus.js first,
		// which provides PalmSystem and the services (see tools/build.sh).
		document.body.innerHTML = "<p style='margin:2em'>Contacts needs LuneOS. In a desktop browser, open debug.html of a development build.</p>";
		return;
	}
	window.PalmSystem.stageReady();
	Source.create({name:'db8', kind: db8Source});
	window.contactsApp = new ContactsApplication({name: "app"});
});

// index.js - Contacts app for LuneOS
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var ready = require('enyo/ready'),
	Source = require('enyo/Source'),
	db8Source = require('./src/data/db8Source'),
	db8SourceMock = require('./src/data/db8SourceMock'),
	ContactsApplication = require('./src/ContactsApplication');


ready(function() {
	if (window.PalmSystem) {
		window.PalmSystem.stageReady();
		//load contacts from db8:
		Source.create({name:'db8', kind: db8Source});
	} else {
		//use mocking source:
		Source.create({name:'db8', kind: db8SourceMock});
	}
	new ContactsApplication({name: "app"});
});

// ContactsApplication.js - app object for Contacts app for LuneOS
// Copyright © 2013-2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License
/*jsl:import data/ContactModel.js*/

var
    kind = require('enyo/kind'),
    Application = require('enyo/Application'),
    MainView = require('./views/MainView');


module.exports = kind({
    name: "ContactsApplication",
    kind: Application,
    view: MainView
});

/* exported app */
/*jsl:import data/ContactModel.js*/
enyo.kind({
    name: "contacts.Application",
    kind: "enyo.Application",
    view: "contacts.MainView",
    
    create: function () {
        this.inherited(arguments);
    }
});

enyo.ready(function () {
    if (window.PalmSystem) {
        window.PalmSystem.stageReady();
        //load contacts from db8:
        enyo.Source.create({name:'db8', kind:'db8Source'});
    } else {
        //use mocking source:
    	enyo.Source.create({name:'db8', kind:'db8SourceMock'});
    }
    new contacts.Application({name: "app"});
});

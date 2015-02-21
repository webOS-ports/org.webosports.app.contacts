/* exported app */
/*jsl:import data/ContactModel.js*/

var accountsHash = {};   // HACK: global so ContactModel can access it

enyo.kind({
    name: "contacts.Application",
    kind: "enyo.Application",
    view: "contacts.MainView",
    accounts: [],
    
    components: [
    	{name: "accountsService", kind: "LunaService", service: "luna://com.palm.service.accounts", method: "listAccounts", onResponse: "accountsResponse", onError:"accountsError"}
    ],
    
    create: function () {
        this.inherited(arguments);
        this.$.accountsService.send();
    },
    
    accountsResponse: function (inSender, inResponse) {
    	this.accounts = [];
    	accountsHash = {};
    	inResponse.results.forEach(function (account) {
    		account.capabilityProviders.forEach(function (provider) {
    			if (provider.capability === "CONTACTS") {
    				this.accounts.push({
    					content: account.loc_name + (account.username ? " — " + account.username : ""),
    					accountId: account._id,
    					dbkind: provider.dbkinds.contact,
    					icon32: account.icon.loc_32x32,
    					icon48: account.icon.loc_48x48,
    					icon64: account.icon.loc_64x64
    				});
    				accountsHash[account._id] = {icon: account.icon.loc_48x48 || account.icon.loc_64x64 || account.icon.loc_32x32};
    			}
    		}, this);
    	}, this);
    	this.accounts[this.accounts.length > 1 ? 1 : 0].active = true;
    	this.log(this.accounts, accountsHash);
    },
    accountsError: function (inSender, inError) {
    	this.error(inError, inError.errorText);
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

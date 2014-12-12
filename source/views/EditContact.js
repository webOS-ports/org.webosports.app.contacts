/* EditContact.js - Edit or add a contact - org.webosports.app.contact */

/** utility kind for several types of details
 * We ought to be able to adjust the menu items, but create methods fail with inexplicable errors here. */
enyo.kind({
	name: "contacts.textTypeRepeater", 
	kind: "enyo.DataRepeater",
	published: {
		inputType: "",
		placeholder: ""
	},
    components: [{
    	kind: "onyx.InputDecorator", style: "position: relative; height: 1.55rem;", components: [
 	        {name: "detailInput", kind: "onyx.Input", type: "text", onchange: "textTypeChange"},
 	        {kind: "onyx.PickerDecorator", style: "position: absolute; top: 0rem; right: 0.1rem;", components: [
 	            {name: "detailType", style: "min-width: 6rem; text-transform: capitalize"},
 	            {name: "detailPicker", kind: "onyx.Picker", scrolling: false, onSelect: "", components: [
       	             {name: "type_mobile_item", content: $L("Mobile"), value: "type_mobile"},
 	                 {name: "type_home_item", content: $L("Home"), value: "type_home"},
 	                 {name: "type_work_item", content: $L("Work"), value: "type_work"},
 	                 {name: "type_other_item", content: $L("Other"), value: "type_other"}
 	            ]}
 	        ]}
 	    ],
        bindings: [
       		{ from: ".container.inputType", to: ".$.detailInput.type" },   // TODO: Is there a better way to do this?
      		{ from: ".container.placeholder", to: ".$.detailInput.placeholder" },
            { from: ".model.value", to: ".$.detailInput.value" },
            { from: ".model.type", to: ".$.detailType.content", transform: function (type) {
            	return type && type.length > 5 ? type.slice(5) : $L("Other");
            } },
            { from: ".model.type", to: ".$.detailPicker.selected", transform: function (type) {
            	return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
            }}
        ],
        textTypeChange: function (inSender, inEvent) {
        	this.log(inEvent.child.parent.owner);
        	var collection = inEvent.child.parent.owner.collection;
        	// Is there a better way to get the collection?
        	// this.owner.$.addressRepeater.collection also works
        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
        		collection.add({value: ""});
        	}
        }
	}]
});


/** the pane that's used for both adding & editing a contact */
enyo.kind({
	name: "contacts.EditContact",
    kind: "FittableRows",
    events: {
        onCancel: "",
        onSave: ""
    },
    published: {
        title: "",
        person: {}
    },
    bindings: [
        {from: ".title", to: ".$.titleText.content"},
        {from: ".person", to: ".$.phoneRepeater.collection", transform: function (person) {
            console.log("person.phoneNumbers", person.phoneNumbers); 
            var phoneNumbers = person.phoneNumbers || [];
            var c = new enyo.Collection(phoneNumbers);
            c.add({value: "(503) 555-1212", type: "type_home"});
            c.add({value: ""});
//            console.log("phone collection", c);
            return c;
        }},
        {from: ".person", to: ".$.emailRepeater.collection", transform: function (person) {
            console.log("person.emails", person.emails); 
            var emails = person.emails || [];
            var c = new enyo.Collection(emails);
            c.add({value: "foo@example.com", type: "type_work"});
            c.add({value: ""});
//            console.log("email collection", c);
            return c;
        }},
        {from: ".person", to: ".$.imRepeater.collection", transform: function (person) {
            console.log("person.ims", person.ims); 
            var ims = person.ims || [];
            var c = new enyo.Collection(ims);
            c.add({value: "psmith", type: "type_icq"});
            c.add({value: ""});
//            console.log("IM collection", c);
            return c;
        }},
        {from: ".person", to: ".$.addressRepeater.collection", transform: function (person) {
            console.log("person.addresses", person.addresses); 
            var addresses = person.addresses || [];
            var c = new enyo.Collection(addresses);
            c.add({value: "123 Fake St.\nSpringfield, OH", type: "type_home"});
            c.add({value: ""});
//            console.log("email collection", c);
            return c;
        }}
    ],
	components: [
        {
            name: "topToolbar",
            kind: "onyx.Toolbar",
            layoutKind: "FittableHeaderLayout",
            components: [
                 // TODO: center title text in window
                {name: "titleText", fit: true, content: "", style: "text-align:center"},
                {kind: "onyx.PickerDecorator", components: [
		 		    {},   // PickerButton
		 		    {name: "accountPicker", kind: "onyx.Picker", components: [  // TODO: use this
		 		        {content: "first account", active: true},
		 		        {content: "second account"}
		 		    ]}
		 		]}
            ]
        },
        {
        	fit: true,
        	kind: "enyo.Scroller", 
        	horizontal: "hidden",
        	strategyKind: "TranslateScrollStrategy",
        	classes: "edit-main",
        	style: "",
        	components: [
        	    {
        	    	kind: "FittableColumns",
        	    	components: [
    	                {
    	                    classes: "avatar",
    	                    components: [
    	                        { kind: "enyo.Image", name: "photo", sizing: "cover", classes: "img", src: "'assets/bg_icon_favorite_img.png'" },
    	                        { classes: "mask"}
    	                    ]
    	                },
    	                {fit: true, kind: "onyx.Groupbox", classes: "edit-top-groupbox", components: [
    	                    {kind: "onyx.InputDecorator", components: [
                           	    {name: "nameInput", kind: "onyx.Input", placeholder: $L("Name"), attributes: {inputmode: "latin-name"}}
                          	]},
    	                    {kind: "onyx.InputDecorator", components: [
                           	    {name: "nicknameInput", kind: "onyx.Input", placeholder: $L("Nickname"), attributes: {inputmode: "latin-name"}}
                           	]},
    	                    {kind: "onyx.InputDecorator", components: [
    	                        {name: "jobTitleInput", kind: "onyx.Input", placeholder: $L("Job title"), attributes: {inputmode: "latin-name"}}
    	                    ]},
    	                    {kind: "onyx.InputDecorator", components: [
                           	    {name: "departmentInput", kind: "onyx.Input", placeholder: $L("Department"), attributes: {inputmode: "latin-name"}}
                           	]},
    	                    {kind: "onyx.InputDecorator", components: [
    	                        {name: "organizationInput", kind: "onyx.Input", placeholder: $L("Organization"), attributes: {inputmode: "latin-name"}}
    	                    ]}
    	                ]}
        	    	]
        	    },
				{kind: "onyx.Groupbox", style: "margin-top: 0.5rem;", components: [
					{name: "phoneRepeater", kind: "contacts.textTypeRepeater", inputType: "tel", placeholder: $L("New phone number")}
				]},
				{kind: "onyx.Groupbox", style: "margin-top: 0.5rem;", components: [
		            {name: "emailRepeater", kind: "contacts.textTypeRepeater", inputType: "email", placeholder: $L("New email address")}
		        ]},
        	    {kind: "onyx.Groupbox", style: "margin-top: 0.5rem;", components: [
           	        {name: "imRepeater", kind: "enyo.DataRepeater", components: [
           	            {
                           components: [
          	                    {kind: "onyx.InputDecorator", style: "position: relative; height: 1.55rem;", components: [
                        	        {name: "imInput", kind: "onyx.Input", type: "text", placeholder: $L("New IM address"), onchange: "imChange"},
                        	        {kind: "onyx.PickerDecorator", style: "position: absolute; top: 0rem; right: 0.1rem;", components: [
                        	            {name: "imType", style: "min-width: 8rem; text-transform: capitalize;"},
                        	            {name: "imPicker", kind: "onyx.Picker", floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), onSelect: "", components: [
                        	                 // TODO: figure out what these need to be, so we can tap on an entry to send a message
                        	                 {name: "type_aim_item", content: $L("AIM"), value: "type_aim"},
                        	                 // There's no such thing as a Bonjour messaging account; it works without accounts.
                        	                 {name: "type_facebook_item", content: $L("Facebook"), value: "type_facebook"},
                        	                 {name: "type_gadugadu_item", content: $L("Gadu-Gadu"), value: "type_gadugadu"},
                        	                 {name: "type_icq_item", content: $L("ICQ"), value: "type_icq"},
                        	                 {name: "type_irc_item", content: $L("IRC"), value: "type_irc"},
                        	                 {name: "type_jabber_item", content: $L("Jingle / Jabber / XMPP"), value: "type_jabber"},   // Google Talk, LJ Talk, Gizmo5, Facebook Chat, ...)
                        	                 {name: "type_sametime_item", content: $L("Lotus Sametime"), value: "type_sametime"},
                        	                 {name: "type_mxit_item", content: $L("Mxit"), value: "type_mxit"},
                        	                 {name: "type_myspace_item", content: $L("MySpace IM"), value: "type_myspace"},
                        	                 {name: "type_groupwise_item", content: $L("Novell GroupWise"), value: "type_groupwise"},
                        	                 {name: "type_silc_item", content: $L("SILC"), value: "type_silc"},
                        	                 {name: "type_simple_item", content: $L("Simple / LCS"), value: "type_simple"},   // includes MS "Live Communication Server"
                        	                 {name: "type_yahoo_item", content: $L("Yahoo"), value: "type_yahoo"},
                        	                 {name: "type_zephr_item", content: $L("Zephr"), value: "type_zephr"},
                        	                 {classes: "onyx-menu-divider"},   // after this are protocols we don't yet or can't support
                        	                 {name: "type_imessage_item", content: $L("iMessage"), value: "type_imessage"},
                        	                 {name: "type_linkedin_item", content: $L("LinkedIn"), value: "type_linkedin"},
                        	                 {name: "type_skype_item", content: $L("Skype"), value: "type_skype"},   // we'd need more than the skype4pidgin plugin
                        	                 {name: "type_telegram_item", content: $L("Telegram"), value: "type_telegram"},
                        	                 {name: "type_textsecure_item", content: $L("TextSecure"), value: "type_textsecure"},   // uses phone # as ID
                        	                 {name: "type_threema_item", content: $L("Threema"), value: "type_threema"},
                        	                 {name: "type_twitter_item", content: $L("Twitter"), value: "type_twitter"},
                        	                 {name: "type_qq_item", content: $L("QQ"), value: "type_qq"},
                        	                 {name: "type_whatsapp_item", content: $L("WhatsApp"), value: "type_whatsapp"},
                        	              	 // incl. dead networks like .Mac, MobileMe, Windows Messenger Serv., TOC2
                        	                 {name: "type_other_item", content: $L("Other"), value: "type_default"}   // should this be type_other?
//                        	                 {content: $L("Windows Live Messenger"), value: "type_msn"},
                        	            ]}
                        	        ]}
                        	    ]}
                           ],
                           bindings: [
                               {from: ".model.value", to: ".$.imInput.value"},
                               {from: ".model.type", to: ".$.imType.content", transform: function (type) {return type && type.length > 5 ? type.slice(5) : $L("Other");} },
                               { from: ".model.type", to: ".$.imPicker.selected", transform: function (type) {
                               		return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
                               }}
                           ],
                           imChange: function (inSender, inEvent) {
                           	   var collection = inEvent.child.parent.owner.collection;
                           	   // Is there a better way to get the collection?
                           	   // this.owner.$.addressRepeater.collection also works
		          	        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
		          	        		collection.add({value: ""});
		          	        	}
		          	       }
                        }
                    ]}
   	            ]},
        	    {kind: "onyx.Groupbox", style: "margin-top: 0.5rem;", components: [
          	        {name: "addressRepeater", kind: "enyo.DataRepeater", components: [
          	            {
                            components: [
         	                    {kind: "onyx.InputDecorator", style: "position: relative;", components: [
	                       	        {name: "addressInput", kind: "onyx.TextArea", placeholder: $L("New address"), onchange: "addressChange"},
	                       	        {kind: "onyx.PickerDecorator", style: "position: absolute; top: 0.8rem; right: 0.1rem;", components: [
	                       	            {name: "addressType", style: "min-width: 5rem; text-transform: capitalize;"},
	                       	            {name: "addressPicker", kind: "onyx.Picker", floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
	                      	                {name: "type_home_item", content: $L("Home"), value: "type_home"},
	                      	                {name: "type_work_item", content: $L("Work"), value: "type_work"},
	                      	                {name: "type_other_item", content: $L("Other"), value: "type_other"}
	                       	            ]}
	                       	        ]}
	                       	    ]}
                            ],
                            bindings: [
                                {from: ".model.value", to: ".$.addressInput.value"},
                                {from: ".model.type", to: ".$.addressType.content", transform: function (type) {return type && type.length > 5 ? type.slice(5) : $L("Other");} },
                                { from: ".model.type", to: ".$.addressPicker.selected", transform: function (type) {
                              		return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
                                }}
                            ],
                            addressChange: function (inSender, inEvent) {
                            	var collection = inEvent.child.parent.owner.collection;
                            	// Is there a better way to get the collection?
                            	// this.owner.$.addressRepeater.collection also works
		          	        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
		          	        		collection.add({value: ""});
		          	        	}
		          	        }
                        }
                    ]}
  	            ]}
            ]
        },
        {
            name: "bottomToolbar",
            kind: "onyx.Toolbar",
            layoutKind: "FittableHeaderLayout",
            components: [
                {kind: "onyx.Button", content: $L("Cancel"), classes: "onyx-negative", style: "width: 10rem;", ontap: "doCancel"},
                {fit: true},
                {kind: "onyx.Button", content: $L("Done"), classes: "onyx-affirmative", style: "width: 10rem;", ontap: "doneTap"}
            ]
        }
    ],

    doneTap: function (inSender, inEvent) {
		this.log(this.person);
    	this.doSave({person: this.person});
    }
});

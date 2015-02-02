/* EditContact.js - Edit or add a contact - org.webosports.app.contact */
/*jsl:import ../data/PersonModel.js */

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
        classes: "flex-row", components: [
	    	{kind: "onyx.InputDecorator", classes: "flex-auto", components: [
	 	        {name: "detailInput", kind: "onyx.Input", type: "text", onchange: "textTypeChange"}
	 	    ]},
 	        {kind: "onyx.PickerDecorator", classes: "flex-none", components: [
	            {name: "detailType", style: "min-width: 6rem; text-transform: capitalize"},
	            {name: "detailPicker", kind: "onyx.Picker", scrolling: false, components: [
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
            { from: ".model.value", to: ".$.detailInput.value", oneWay: false },
            { from: ".model.type", to: ".$.detailPicker.selected", oneWay: false, transform: function (type, dir) {
            	if (dir & enyo.Binding.DIRTY_FROM) {
            		return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
            	} else {
            		return type.value;
            	}
            }}
        ],
        textTypeChange: function (inSender, inEvent) {
        	console.log("textTypeChange", inEvent.child.parent.owner);
        	var collection = inEvent.child.parent.owner.collection;
        	// Is there a better way to get the collection?
        	// this.owner.$.addressRepeater.collection also works
        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
        		collection.add({value: "", type: "type_home", favoriteData: {}, normalizedValue: ""});
        	} else if (! inEvent.originator.value && inEvent.index !== collection.length - 1) {
        		collection.remove(collection.at(inEvent.index));
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
        person: new PersonModel()
    },
    bindings: [
        {from: ".title", to: ".$.titleText.content"},
        {from: ".person.name", to: ".$.nameInput.value", transform: function (name) {
        	var fullName = "";
            if (name.honorificPrefix) {
                fullName += name.honorificPrefix + " ";
            }
            if (name.givenName) {
                fullName += name.givenName + " ";
            }
            if (name.middleName) {
                fullName += name.middleName + " ";
            }
            if (name.familyName) {
                fullName += name.familyName;
            }
            if (name.honorificSuffix) {
                if (name.honorificSuffix.charAt(1) === " ") { //handle ", PhD" case.
                    fullName += name.honorificSuffix;
                } else {
                    fullName += ", " + name.honorificSuffix;
                }
            }
            return fullName.trim();
        }},
        {from: ".person.nickname", to: ".$.nicknameInput.value", oneWay: false},
        {from: ".person.organization", to: ".$.jobTitleInput.value", transform: function (organization) {
        	return organization.title;
        }},
        {from: ".person.organization", to: ".$.departmentInput.value", transform: function (organization) {
        	return organization.department;
        }},
        {from: ".person.organization", to: ".$.organizationInput.value", transform: function (organization) {
        	return organization.name;
        }},
        {from: ".person.phoneNumbers", to: ".$.phoneRepeater.collection", transform: function (phoneNumbers) {
            console.log("phoneNumbers", phoneNumbers); 
            var c = new enyo.Collection(phoneNumbers);
            c.add({value: "", type: "type_mobile", favoriteData: {}, normalizedValue: ""});
//            console.log("phone collection", c);
            return c;
        }},
        {from: ".person.emails", to: ".$.emailRepeater.collection", transform: function (emails) {
            console.log("emails", emails); 
            var c = new enyo.Collection(emails);
            c.add({value: "", type: "type_home", favoriteData: {}, normalizedValue: ""});
//            console.log("email collection", c);
            return c;
        }},
        {from: ".person.ims", to: ".$.imRepeater.collection", transform: function (ims) {
            console.log("ims", ims); 
            var c = new enyo.Collection(ims);
            c.add({value: "", favoriteData: {}, normalizedValue: ""});
//            console.log("IM collection", c);
            return c;
        }},
        {from: ".person.addresses", to: ".$.addressRepeater.collection", transform: function (addresses) {
            console.log("addresses", addresses); 
            var c = new enyo.Collection(addresses);
            c.add({streetAddress: "", locality: "", region: "", country: "", postalCode: "", type: "type_home"});
//            console.log("email collection", c);
            return c;
        }},
        {from: ".person.urls", to: ".$.urlRepeater.collection", transform: function (urls) {
            console.log("urls", urls); 
            var c = new enyo.Collection(urls);
            c.add({value: ""});
//            console.log("url collection", c);
            return c;
        }},
        {from: ".person.notes", to: ".$.noteRepeater.collection", transform: function (notes) {
            console.log("notes", notes); 
        	// person.notes is an array of strings; Collections accepts only objects & arrays of objects
            var c = new enyo.Collection();
            for (var i=0; i<notes.length; ++i) {
                c.add({value: notes[i]});
            }
            c.add({value: ""});
//            console.log("note collection", c);
            return c;
        }},
        {from: ".person.birthday", to: ".$.birthdayInput.value", oneWay: false},
        {from: ".person.relations", to: ".$.relationRepeater.collection", transform: function (relations) {
            console.log("relations", relations);
            var c = new enyo.Collection(relations);
            c.add({value: "", type: "type_spouse"});
//            console.log("IM collection", c);
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
				{kind: "onyx.Groupbox", components: [
					{name: "phoneRepeater", kind: "contacts.textTypeRepeater", inputType: "tel", placeholder: $L("New phone number")}
				]},
				{kind: "onyx.Groupbox", components: [
		            {name: "emailRepeater", kind: "contacts.textTypeRepeater", inputType: "email", placeholder: $L("New email address")}
		        ]},
        	    {kind: "onyx.Groupbox", components: [
           	        {name: "imRepeater", kind: "enyo.DataRepeater", components: [
           	            {   classes: "flex-row",
                            components: [
          	                    {kind: "onyx.InputDecorator", classes: "flex-auto", components: [
                        	        {name: "imInput", kind: "onyx.Input", type: "text", placeholder: $L("New IM address"), onchange: "imChange"}
                        	    ]},
                    	        {kind: "onyx.PickerDecorator", classes: "flex-none", components: [
	                	            {name: "imType", style: "min-width: 8rem; text-transform: capitalize;"},
	                	            {name: "imPicker", kind: "onyx.Picker", floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
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
	                	              	 // incl. dead networks like .Mac, MobileMe, Windows Messenger Serv., TOC2
	                	                 {name: "type_other_item", content: $L("Other"), value: "type_other"},
	                	                 {name: "type_imessage_item", content: $L("iMessage"), value: "type_imessage"},
	                	                 {name: "type_linkedin_item", content: $L("LinkedIn"), value: "type_linkedin"},
	                	                 {name: "type_skype_item", content: $L("Skype"), value: "type_skype"},   // we'd need more than the skype4pidgin plugin
	                	                 {name: "type_telegram_item", content: $L("Telegram"), value: "type_telegram"},
	                	                 {name: "type_textsecure_item", content: $L("TextSecure"), value: "type_textsecure"},   // uses phone # as ID
	                	                 {name: "type_threema_item", content: $L("Threema"), value: "type_threema"},
	                	                 {name: "type_twitter_item", content: $L("Twitter"), value: "type_twitter"},
	                	                 {name: "type_qq_item", content: $L("QQ"), value: "type_qq"},
	                	                 {name: "type_whatsapp_item", content: $L("WhatsApp"), value: "type_whatsapp"}
									    // {content: $L("Windows Live Messenger"), value: "type_msn"},
	                	            ]}
	                	        ]}                        	    
                           ],
                           bindings: [
                               {from: ".model.value", to: ".$.imInput.value", oneWay: false},
                               {from: ".model.type", to: ".$.imPicker.selected", oneWay: false, transform: function (type, dir) {
                            	   if (dir & enyo.Binding.DIRTY_FROM) {
										return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
                            	   } else {
                            		   return type.value;
                            	   }
                               }}
                           ],
                           imChange: function (inSender, inEvent) {
                           	   var collection = inEvent.child.parent.owner.collection;
                           	   // Is there a better way to get the collection?
                           	   // this.owner.$.addressRepeater.collection also works
		          	        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
		          	        		collection.add({value: "", favoriteData: {}, normalizedValue: ""});
		          	        	} else if (! inEvent.originator.value && inEvent.index !== collection.length - 1) {
		          	        		collection.remove(collection.at(inEvent.index));
		          	        	}
		          	       }
                        }
                    ]}
   	            ]},
        	    {kind: "onyx.Groupbox", components: [
          	        {name: "addressRepeater", kind: "enyo.DataRepeater", components: [
          	            {   
//          	            	style: "width: 100%; box-sizing: border-box;",
          	            	components: [
              	                { classes: "flex-row", components: [
               	                    {kind: "onyx.InputDecorator", classes: "flex-auto", components: [
    	                       	        {name: "addressInput", kind: "onyx.Input", placeholder: $L("New street address"), onchange: "addressChange"}
    	                       	    ]},
                           	        {kind: "onyx.PickerDecorator", classes: "flex-none", components: [
                           	            {name: "addressType", style: "min-width: 5rem; text-transform: capitalize;"},
                           	            {name: "addressPicker", kind: "onyx.Picker", floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
                          	                {name: "type_home_item", content: $L("Home"), value: "type_home"},
                          	                {name: "type_work_item", content: $L("Work"), value: "type_work"},
                          	                {name: "type_other_item", content: $L("Other"), value: "type_other"}
                           	            ]}
                           	        ]}
              	                ]},
              	                // TODO: remove this row, and parse addressInput (using locale) into these fields 
              	                { classes: "flex-row", components: [
              	                    {kind: "onyx.InputDecorator", classes: "flex-auto", components: [
     	                       	        {name: "localityInput", kind: "onyx.Input", placeholder: $L("City"), onchange: "addressChange"}
     	                       	    ]},
           	                    	{kind: "onyx.InputDecorator", classes: "flex-auto", components: [
      	                       	        {name: "regionInput", kind: "onyx.Input", placeholder: $L("State"), onchange: "addressChange"}
      	                       	    ]},
        	                    	{kind: "onyx.InputDecorator", classes: "flex-auto", components: [
      	                       	        {name: "countryInput", kind: "onyx.Input", placeholder: $L("Country"), onchange: "addressChange"}
      	                       	    ]},
        	                    	{kind: "onyx.InputDecorator", classes: "flex-auto", components: [
      	                       	        {name: "postalCodeInput", kind: "onyx.Input", placeholder: $L("ZIP code"), onchange: "addressChange"}
      	                       	    ]}
              	                ]}
          	                ],
                            bindings: [
                                {from: ".model.streetAddress", to: ".$.addressInput.value", oneWay: false},
                                {from: ".model.locality", to: ".$.localityInput.value", oneWay: false},
                                {from: ".model.region", to: ".$.regionInput.value", oneWay: false},
                                {from: ".model.country", to: ".$.countryInput.value", oneWay: false},
                                {from: ".model.postalCode", to: ".$.postalCodeInput.value", oneWay: false},
                                { from: ".model.type", to: ".$.addressPicker.selected", oneWay: false, transform: function (type, dir) {
                                	if (dir & enyo.Binding.DIRTY_FROM) {
                              			return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
                                	} else {
                                		return type.value;
                                	}
                                }}
                            ],
                            addressChange: function (inSender, inEvent) {
                            	var collection = inEvent.child.parent.owner.collection;
                            	// Is there a better way to get the collection?
                            	// this.owner.$.addressRepeater.collection also works
		          	        	if (inEvent.index === collection.length - 1 && inEvent.originator.value ) {
		          	        		collection.add({streetAddress: "", locality: "", region: "", country: "", postalCode: "", type: "type_home"});
		          	        	} else {
		          	        		if (inEvent.index !== collection.length - 1 && ! this.$.addressInput.value && 
		          	        				! this.$.localityInput.value && ! this.$.regionInput.value && 
		          	        				! this.$.countryInput.value && ! this.$.postalCodeInput.value) {
					          	        		collection.remove(collection.at(inEvent.index));
		          	        		}
		          	        	}
		          	        }
                        }
                    ]}
  	            ]},
        	    {kind: "onyx.Groupbox", components: [
          	        {name: "urlRepeater", kind: "enyo.DataRepeater", components: [{
          	        	components: [
         	                {kind: "onyx.InputDecorator", components: [
                       	        {name: "urlInput", kind: "onyx.Input", type: "url", placeholder: $L("New URL"), onchange: "urlChange"}
                       	    ]}
                        ],
                        bindings: [
                            {from: ".model.value", to: ".$.urlInput.value", oneWay: false}
                        ],
                        urlChange: function (inSender, inEvent) {
                           	var collection = inEvent.child.parent.owner.collection;
                          	// Is there a better way to get the collection?
                          	// this.owner.$.addressRepeater.collection also works
              	        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
              	        		collection.add({value: ""});
              	        	} else if (! inEvent.originator.value && inEvent.index !== collection.length - 1) {
              	        		collection.remove(collection.at(inEvent.index));
              	        	}
	          	        }
                    }]}
  	            ]},
        	    {kind: "onyx.Groupbox", components: [
          	        {name: "noteRepeater", kind: "enyo.DataRepeater", components: [{
          	        	components: [
         	                {kind: "onyx.InputDecorator", components: [
                       	        {name: "noteInput", kind: "onyx.TextArea", placeholder: $L("New note"), onchange: "noteChange"}
                       	    ]}    
                        ],
                        bindings: [
                            {from: ".model.value", to: ".$.noteInput.value", oneWay: false}
                        ],
                        noteChange: function (inSender, inEvent) {
                           	var collection = inEvent.child.parent.owner.collection;
                          	// Is there a better way to get the collection?
                          	// this.owner.$.addressRepeater.collection also works
              	        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
              	        		collection.add({value: ""});
              	        	} else if (! inEvent.originator.value && inEvent.index !== collection.length - 1) {
              	        		collection.remove(collection.at(inEvent.index));
              	        	}
	          	        }
                    }]}
  	            ]},
                {kind: "onyx.Groupbox", components: [
                    {kind: "onyx.InputDecorator", style: "position: relative;", components: [
                        // consider changing type to "date", when the browser properly supports it
                 	    {name: "birthdayInput", kind: "onyx.Input", type: "text"},
                        {content: $L("Birthday"), style: "position: absolute; right: 0.5rem; top: 0.5rem; color: gray;"}
                	]}
                    
                    // TODO: ringtone - can wait until we can receive phone calls
                ]},
        	    {kind: "onyx.Groupbox", components: [
        	        {name: "relationRepeater", kind: "enyo.DataRepeater", components: [
        	            {   classes: "flex-row",
                         components: [
       	                    {kind: "onyx.InputDecorator", classes: "flex-auto", components: [
                     	        {name: "relationInput", kind: "onyx.Input", type: "text", placeholder: $L("New relation"), onchange: "relationChange"}
                     	    ]},
                 	        {kind: "onyx.PickerDecorator", classes: "flex-none", components: [
                	            {name: "relationType", style: "min-width: 10.3rem; text-transform: capitalize;"},
                	            {name: "relationPicker", kind: "onyx.Picker", floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
                	                 {name: "type_assistant_item", content: $L("Assistant"), value: "type_assistant"},
                	                 {name: "type_brother_item", content: $L("Brother"), value: "type_brother"},
                	                 {name: "type_child_item", content: $L("Child"), value: "type_child"},
                	                 {name: "type_domestic_partner_item", content: $L("Domestic Partner"), value: "type_domestic_partner"},
                	                 {name: "type_father_item", content: $L("Father"), value: "type_father"},
                	                 {name: "type_friend_item", content: $L("Friend"), value: "type_friend"},
                	                 {name: "type_manager_item", content: $L("Manager"), value: "type_manager"},
                	                 {name: "type_mother_item", content: $L("Mother"), value: "type_mother"},
                	                 {name: "type_parent_item", content: $L("Parent"), value: "type_parent"},
                	                 {name: "type_partner_item", content: $L("Partner"), value: "type_partner"},
                	                 {name: "type_referred_by_item", content: $L("Referred by"), value: "type_referred_by"},
                	                 {name: "type_relative_item", content: $L("Relative"), value: "type_relative"},
                	                 {name: "type_sister_item", content: $L("Sister"), value: "type_sister"},
                	                 {name: "type_spouse_item", content: $L("Spouse"), value: "type_spouse"},
                	                 {name: "type_other_item", content: $L("Other"), value: "type_other"}
                	            ]}
                	        ]}                        	    
                        ],
                        bindings: [
                            {from: ".model.value", to: ".$.relationInput.value", oneWay: false},
                            {from: ".model.type", to: ".$.relationPicker.selected", oneWay: false, transform: function (type, dir) {
                            	if (dir & enyo.Binding.DIRTY_FROM) {
                            		return this.$[type && type.length > 5 ? type + "_item" : "type_other_item"];
                            	} else {
                            		return type.value;
                            	}
                            }}
                        ],
                        relationChange: function (inSender, inEvent) {
                        	   var collection = inEvent.child.parent.owner.collection;
                        	   // Is there a better way to get the collection?
                        	   // this.owner.$.addressRepeater.collection also works
	          	        	if (inEvent.originator.value && inEvent.index === collection.length - 1) {
	          	        		collection.add({value: "", type: "type_spouse"});
	          	        	} else if (! inEvent.originator.value && inEvent.index !== collection.length - 1) {
	          	        		collection.remove(collection.at(inEvent.index));
	          	        	}
	          	       }
                     }
                 ]}
	            ]},
  	            {style: "height: 1rem;"}   // hack because scroller cuts off last item
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
    
    showingChanged: function (inOld) {
    	this.inherited (arguments);
    	if (inOld === false && this.get("showing") === true) {
    		this.$.scroller.scrollToTop();
    	}
    },

    doneTap: function (inSender, inEvent) {
    	// set attributes directly to avoid uselessly trigering the bindings
    	// TODO: call set once, with all the displayName-affecting properties
    	
    	// TODO: when we implement individual name fields, parsing the full name field will happen in onchange
    	this.parseName();
    	
    	// nickname is 2-way

    	this.person.set("organization", {
			title: this.$.jobTitleInput.get("value").trim(),
			department: this.$.departmentInput.get("value").trim(),
			name: this.$.organizationInput.get("value").trim()
		});
		// We use set, so displayName is updated
		
    	this.person.attributes.phoneNumbers = this.$.phoneRepeater.collection.raw().slice(0, -1);
		
    	this.person.set("emails", this.$.emailRepeater.collection.raw().slice(0, -1));
		// We use set, so displayName is updated
		
		this.person.set("ims", this.$.imRepeater.collection.raw().slice(0, -1));
		// We use set, so displayName is updated

		this.person.attributes.addresses = this.$.addressRepeater.collection.raw().slice(0, -1);

		this.person.attributes.urls = this.$.urlRepeater.collection.raw().slice(0, -1);
		
		this.person.attributes.notes = this.$.noteRepeater.collection.map(function (currentValue, index) {
			return currentValue.get("value");
		}).slice(0, -1);
		
		// birthday is 2-way

		this.person.attributes.relations = this.$.relationRepeater.collection.raw().slice(0, -1);

		this.doSave({person: this.person});
    },
    
    parseName: function () {
    	var honorificPrefix, givenName, middleName, familyName, honorificSuffix;
    	var fullName = this.$.nameInput.value.trim();
		honorificPrefix = givenName = middleName = familyName = honorificSuffix = "";
		
		this.prefixPatt.lastIndex = 0;
		var prefixMatch = this.prefixPatt.exec(fullName);
		if (prefixMatch) {
			honorificPrefix = prefixMatch[0].trim();
			fullName = fullName.slice(this.prefixPatt.lastIndex);
		}
		
		this.suffixPatt.lastIndex = 0;
		var suffixMatch = this.suffixPatt.exec(fullName);
		if (suffixMatch) {
			honorificSuffix = suffixMatch[0];
			fullName = fullName.slice(0, suffixMatch.index);
		}
		
		var names = fullName.split(/\s+/);
		if (names.length >= 2) {
			givenName = names.slice(0, names.length-1).join(" ");
			familyName = names[names.length-1];
		} else {
			familyName = fullName;
		}
		this.person.set("name", {honorificPrefix: honorificPrefix, givenName: givenName, middleName: middleName, familyName: familyName, honorificSuffix: honorificSuffix});
		// We use set, so displayName is updated
    },
    
    // Add common honorifics for all languages and cultures to this pattern.
    // Don't bother with noble honorifics.
	prefixPatt: /^((Mr\.|Master|Ms\.|Mrs\.|Miss|Dr\.|(The\s+)?Reverend|Father|(The\s+)Hon(\.|orable)|Herr|Frau|Fräulein|Doktor|Professor)\s*)+/ig,
	suffixPatt: /(,\s*(Ph\. ?D|Junior|Jr\.|II|III|jünger))+$/i
});

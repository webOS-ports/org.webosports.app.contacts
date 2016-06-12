// EditContact.js - Edit or add a contact - org.webosports.app.contact
// Copyright © 2015-2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License
/*jsl:import ../data/PersonModel.js */

var
	kind = require('enyo/kind'),
	Collection = require('enyo/Collection'),
	DataRepeater = require('enyo/DataRepeater'),
	InputDecorator = require('onyx/InputDecorator'),
	Input = require('onyx/Input'),
	TextArea = require('onyx/TextArea'),
	PickerDecorator = require('onyx/PickerDecorator'),
	Picker = require('onyx/Picker'),
	PersonModel = require('../data/PersonModel'),
	FittableRows = require('layout/FittableRows'),
	FittableHeaderLayout = require('layout/FittableHeaderLayout'),
	Toolbar = require('onyx/Toolbar'),
	Scroller = require('enyo/Scroller'),
	FittableColumns = require('layout/FittableColumns'),
	Image = require('enyo/Image'),
	Groupbox = require('onyx/Groupbox'),
	Binding = require('enyo/Binding'),
	Button = require('onyx/Button'),
	accounts = require('../data/accounts'),
	$L = require('enyo/i18n').$L;   // no-op placeholder


/** utility kind for several types of details
 * We ought to be able to adjust the menu items, but create methods fail with inexplicable errors here. */
var TextTypeRepeater = kind({
	name: "TextTypeRepeater",
	kind: DataRepeater,
	published: {
		inputType: "",
		placeholder: ""
	},
    components: [{
        classes: "flex-row", components: [
	    	{kind: InputDecorator, classes: "flex-auto", components: [
	 	        {name: "detailInput", kind: Input, type: "text", onchange: "textTypeChange"}
	 	    ]},
 	        {kind: PickerDecorator, classes: "flex-none", components: [
	            {name: "detailType", style: "min-width: 6rem; text-transform: capitalize"},
	            {name: "detailPicker", kind: Picker, scrolling: false, components: [
      	             {name: "type_mobile_item", content: $L("Mobile"), value: "type_mobile"},
	                 {name: "type_home_item", content: $L("Home"), value: "type_home"},
	                 {name: "type_work_item", content: $L("Work"), value: "type_work"},
	                 {name: "type_other_item", content: $L("Other"), value: "type_other"}
	            ]}
	        ]}
 	    ],
        bindings: [
       		{ from: "container.inputType", to: "$.detailInput.type" },   // TODO: Is there a better way to do this?
      		{ from: "container.placeholder", to: "$.detailInput.placeholder" },
            { from: "model.value", to: "$.detailInput.value", oneWay: false },
            { from: "model.type", to: "$.detailPicker.selected", oneWay: false, transform: function (type, dir) {
            	if (dir & Binding.DIRTY_FROM) {
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
module.exports = kind({
	name: "EditContact",
    kind: FittableRows,
    events: {
        onCancel: "",
        onSave: ""
    },
    published: {
        title: "",
        doneLabel: "",
        oldPerson: new PersonModel(),
        newPerson: null
    },
    bindings: [
        {from: "title", to: "$.titleText.content"},
        {from: "doneLabel", to: "$.doneBtn.content"},
        {from: "oldPerson", to: "newPerson", transform: function (person) {
        	return new PersonModel(person.raw());
        }},
        {from: "newPerson.name", to: "$.nameInput.value", transform: function (name) {
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
        {from: "newPerson.nickname", to: "$.nicknameInput.value", oneWay: false},
        {from: "newPerson.organization", to: "$.jobTitleInput.value", transform: function (organization) {
        	return organization.title;
        }},
        {from: "newPerson.organization", to: "$.departmentInput.value", transform: function (organization) {
        	return organization.department;
        }},
        {from: "newPerson.organization", to: "$.organizationInput.value", transform: function (organization) {
        	return organization.name;
        }},
        {from: "newPerson.phoneNumbers", to: "$.phoneRepeater.collection", transform: function (phoneNumbers) {
            console.log("phoneNumbers", phoneNumbers); 
            var c = new Collection(phoneNumbers);
            c.add({value: "", type: "type_mobile", favoriteData: {}, normalizedValue: ""});
//            console.log("phone collection", c);
            return c;
        }},
        {from: "newPerson.emails", to: "$.emailRepeater.collection", transform: function (emails) {
            console.log("emails", emails); 
            var c = new Collection(emails);
            c.add({value: "", type: "type_home", favoriteData: {}, normalizedValue: ""});
//            console.log("email collection", c);
            return c;
        }},
        {from: "newPerson.ims", to: "$.imRepeater.collection", transform: function (ims) {
            console.log("ims", ims); 
            var c = new Collection(ims);
            c.add({value: "", favoriteData: {}, normalizedValue: ""});
//            console.log("IM collection", c);
            return c;
        }},
        {from: "newPerson.addresses", to: "$.addressRepeater.collection", transform: function (addresses) {
            console.log("addresses", addresses); 
            var c = new Collection(addresses);
            c.add({streetAddress: "", locality: "", region: "", country: "", postalCode: "", type: "type_home"});
//            console.log("email collection", c);
            return c;
        }},
        {from: "newPerson.urls", to: "$.urlRepeater.collection", transform: function (urls) {
            console.log("urls", urls); 
            var c = new Collection(urls);
            c.add({value: ""});
//            console.log("url collection", c);
            return c;
        }},
        {from: "newPerson.notes", to: "$.noteRepeater.collection", transform: function (notes) {
            console.log("notes", notes); 
        	// person.notes is an array of strings; Collections accepts only objects & arrays of objects
            var c = new Collection();
            for (var i=0; i<notes.length; ++i) {
                c.add({value: notes[i]});
            }
            c.add({value: ""});
//            console.log("note collection", c);
            return c;
        }},
        {from: "newPerson.birthday", to: "$.birthdayInput.value", oneWay: false},
        {from: "newPerson.relations", to: "$.relationRepeater.collection", transform: function (relations) {
            console.log("relations", relations);
            var c = new Collection(relations);
            c.add({value: "", type: "type_spouse"});
//            console.log("IM collection", c);
            return c;
        }}
    ],
	components: [
        {
            name: "topToolbar",
            kind: Toolbar,
            layoutKind: FittableHeaderLayout,
            components: [
                 // TODO: center title text in window
                {name: "titleText", fit: true, content: "", style: "text-align:center"},
                {name: "accountPkrDcrtr", kind: PickerDecorator, style: "max-width: 55%;", components: [
		 		    {},   // PickerButton
		 		    {name: "accountPicker", kind: Picker, components: [
		 		    ]}
		 		]}
            ]
        },
        {
        	fit: true,
        	kind: Scroller, 
        	touch: true,
        	components: [
        	    { classes: "edit-main", components: [
        	    {
        	    	kind: FittableColumns,   // TODO: reposition avatar on phone-size screens using flexbox wrap
        	    	components: [
    	                {
    	                    classes: "avatar",
    	                    components: [
    	                        { kind: Image, name: "photo", sizing: "cover", classes: "img", src: "'assets/bg_icon_favorite_img.png'" },
    	                        { classes: "mask"}
    	                    ]
    	                },
    	                {fit: true, kind: Groupbox, classes: "edit-top-groupbox", components: [
    	                    {kind: InputDecorator, components: [
                           	    {name: "nameInput", kind: Input, placeholder: $L("Name"), attributes: {inputmode: "latin-name"}}
                          	]},
    	                    {kind: InputDecorator, components: [
                           	    {name: "nicknameInput", kind: Input, placeholder: $L("Nickname"), attributes: {inputmode: "latin-name"}}
                           	]},
    	                    {kind: InputDecorator, components: [
    	                        {name: "jobTitleInput", kind: Input, placeholder: $L("Job title"), attributes: {inputmode: "latin-name"}}
    	                    ]},
    	                    {kind: InputDecorator, components: [
                           	    {name: "departmentInput", kind: Input, placeholder: $L("Department"), attributes: {inputmode: "latin-name"}}
                           	]},
    	                    {kind: InputDecorator, components: [
    	                        {name: "organizationInput", kind: Input, placeholder: $L("Organization"), attributes: {inputmode: "latin-name"}}
    	                    ]}
    	                ]}
        	    	]
        	    },
				{kind: Groupbox, components: [
					{name: "phoneRepeater", kind: TextTypeRepeater, inputType: "tel", placeholder: $L("New phone number")}
				]},
				{kind: Groupbox, components: [
		            {name: "emailRepeater", kind: TextTypeRepeater, inputType: "email", placeholder: $L("New email address")}
		        ]},
        	    {kind: Groupbox, components: [
           	        {name: "imRepeater", kind: DataRepeater, components: [
           	            {   classes: "flex-row",
                            components: [
          	                    {kind: InputDecorator, classes: "flex-auto", components: [
                        	        {name: "imInput", kind: Input, type: "email", placeholder: $L("New IM address"), onchange: "imChange"}
                        	    ]},
                    	        {kind: PickerDecorator, classes: "flex-none", components: [
	                	            {name: "imType", style: "min-width: 8rem; text-transform: capitalize;"},
	                	            {name: "imPicker", kind: Picker, floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
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
                               {from: "model.value", to: "$.imInput.value", oneWay: false},
                               {from: "model.type", to: "$.imPicker.selected", oneWay: false, transform: function (type, dir) {
                            	   if (dir & Binding.DIRTY_FROM) {
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
        	    {kind: Groupbox, components: [
          	        {name: "addressRepeater", kind: DataRepeater, components: [
          	            {   
//          	            	style: "width: 100%; box-sizing: border-box;",
          	            	components: [
              	                { classes: "flex-row", components: [
               	                    {kind: InputDecorator, classes: "flex-auto", components: [
    	                       	        {name: "addressInput", kind: Input, placeholder: $L("New street address"), onchange: "addressChange"}
    	                       	    ]},
                           	        {kind: PickerDecorator, classes: "flex-none", components: [
                           	            {name: "addressType", style: "min-width: 5rem; text-transform: capitalize;"},
                           	            {name: "addressPicker", kind: Picker, floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
                          	                {name: "type_home_item", content: $L("Home"), value: "type_home"},
                          	                {name: "type_work_item", content: $L("Work"), value: "type_work"},
                          	                {name: "type_other_item", content: $L("Other"), value: "type_other"}
                           	            ]}
                           	        ]}
              	                ]},
              	                // TODO: remove this row, and parse addressInput (using locale) into these fields 
              	                { classes: "flex-row", components: [
              	                    {kind: InputDecorator, classes: "flex-auto", components: [
     	                       	        {name: "localityInput", kind: Input, placeholder: $L("City"), onchange: "addressChange"}
     	                       	    ]},
           	                    	{kind: InputDecorator, classes: "flex-auto", components: [
      	                       	        {name: "regionInput", kind: Input, placeholder: $L("State"), onchange: "addressChange"}
      	                       	    ]},
        	                    	{kind: InputDecorator, classes: "flex-auto", components: [
      	                       	        {name: "countryInput", kind: Input, placeholder: $L("Country"), onchange: "addressChange"}
      	                       	    ]},
        	                    	{kind: InputDecorator, classes: "flex-auto", components: [
      	                       	        {name: "postalCodeInput", kind: Input, placeholder: $L("ZIP code"), onchange: "addressChange"}
      	                       	    ]}
              	                ]}
          	                ],
                            bindings: [
                                {from: "model.streetAddress", to: "$.addressInput.value", oneWay: false},
                                {from: "model.locality", to: "$.localityInput.value", oneWay: false},
                                {from: "model.region", to: "$.regionInput.value", oneWay: false},
                                {from: "model.country", to: "$.countryInput.value", oneWay: false},
                                {from: "model.postalCode", to: "$.postalCodeInput.value", oneWay: false},
                                { from: "model.type", to: "$.addressPicker.selected", oneWay: false, transform: function (type, dir) {
                                	if (dir & Binding.DIRTY_FROM) {
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
        	    {kind: Groupbox, components: [
          	        {name: "urlRepeater", kind: DataRepeater, components: [{
          	        	components: [
         	                {kind: InputDecorator, components: [
                       	        {name: "urlInput", kind: Input, type: "url", placeholder: $L("New URL"), onchange: "urlChange"}
                       	    ]}
                        ],
                        bindings: [
                            {from: "model.value", to: "$.urlInput.value", oneWay: false}
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
        	    {kind: Groupbox, components: [
          	        {name: "noteRepeater", kind: DataRepeater, components: [{
          	        	components: [
         	                {kind: InputDecorator, components: [
                       	        {name: "noteInput", kind: TextArea, placeholder: $L("New note"), onchange: "noteChange"}
                       	    ]}    
                        ],
                        bindings: [
                            {from: "model.value", to: "$.noteInput.value", oneWay: false}
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
                {kind: Groupbox, components: [
                    {kind: InputDecorator, style: "position: relative;", components: [
                        // consider changing type to "date", when the browser properly supports it
                 	    {name: "birthdayInput", kind: Input, type: "text"},
                        {content: $L("Birthday"), style: "position: absolute; right: 0.5rem; top: 0.5rem; color: gray;"}
                	]}
                    
                    // TODO: ringtone - can wait until we can receive phone calls
                ]},
        	    {kind: Groupbox, components: [
        	        {name: "relationRepeater", kind: DataRepeater, components: [
        	            {   classes: "flex-row",
                         components: [
       	                    {kind: InputDecorator, classes: "flex-auto", components: [
                     	        {name: "relationInput", kind: Input, type: "text", placeholder: $L("New relation"), onchange: "relationChange"}
                     	    ]},
                 	        {kind: PickerDecorator, classes: "flex-none", components: [
                	            {name: "relationType", style: "min-width: 10.3rem; text-transform: capitalize;"},
                	            {name: "relationPicker", kind: Picker, floating: true, maxHeight: Math.max((window.innerHeight-72)/2, 200), components: [
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
                            {from: "model.value", to: "$.relationInput.value", oneWay: false},
                            {from: "model.type", to: "$.relationPicker.selected", oneWay: false, transform: function (type, dir) {
                            	if (dir & Binding.DIRTY_FROM) {
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
            ]}]
        },
        {
            name: "bottomToolbar",
            kind: Toolbar,
            layoutKind: FittableHeaderLayout,
            components: [
                {kind: Button, content: $L("Cancel"), classes: "", style: "width: 10rem;", ontap: "cancelTap"},
                {fit: true},
                {name: "doneBtn", kind: Button, content: "", classes: "onyx-affirmative", style: "width: 10rem;", ontap: "doneTap"}
            ]
        }
    ],
    
    showingChanged: function (inOld) {
    	this.inherited (arguments);
    	if (inOld === false && this.get("showing") === true) {
    		this.$.scroller.scrollToTop();
    		if (this.$.accountPicker.getComponents().length === 1) {   // only has scroller
    			this.$.accountPicker.createComponents(accounts.array);
    		}
    	}
		this.$.accountPkrDcrtr.set("showing", this.newPerson.get("contactIds").length === 0);
    },
    
    cancelTap: function (inSender, inEvent) {
    	this.set("oldPerson", new PersonModel());
    	this.doCancel();
    },

    doneTap: function (inSender, inEvent) {
    	// set attributes directly to avoid uselessly trigering the bindings
    	// TODO: call set once, with all the displayName-affecting properties
    	
    	// TODO: when we implement individual name fields, parsing the full name field will happen in onchange
    	// TODO: if field not edited, don't set "name" in model
    	this.parseName();
    	
    	// nickname is 2-way

    	this.newPerson.set("organization", {
			title: this.$.jobTitleInput.get("value").trim(),
			department: this.$.departmentInput.get("value").trim(),
			name: this.$.organizationInput.get("value").trim()
		});
		// We use set, so displayName is updated
		
    	this.newPerson.attributes.phoneNumbers = this.$.phoneRepeater.collection.raw().filter(function (phone) {
    		return phone.value && /[0-9#*A-PR-Ya-pr-y]/.test(phone.value);
    	});
    	
    	this.newPerson.set("emails", this.$.emailRepeater.collection.raw().filter(function (email) {
    		return email.value && /\S/.test(email.value);
    	}));
		// We use set, so displayName is updated
		
		this.newPerson.set("ims", this.$.imRepeater.collection.raw().filter(function (im) {
    		return im.value && /\S/.test(im.value);
    	}));
		// We use set, so displayName is updated

		this.newPerson.attributes.addresses = this.$.addressRepeater.collection.raw().filter(function (address) {
    		return address.streetAddress && /\S/.test(address.streetAddress) ||
    			address.locality && /\S/.test(address.locality) ||
    			address.region && /\S/.test(address.region) ||
    			address.country && /\S/.test(address.country) ||
    			address.postalCode && /[0-9A-Za-z]/.test(address.postalCode);
    	});

		this.newPerson.attributes.urls = this.$.urlRepeater.collection.raw().filter(function (url) {
    		return url.value && /\S/.test(url.value);
    	});
		
		this.newPerson.attributes.notes = this.$.noteRepeater.collection.map(function (currentValue, index) {
			return currentValue.get("value");
		}).filter(function (note) {
    		return /\S/.test(note);
    	});
		
		// birthday is 2-way

		this.newPerson.attributes.relations = this.$.relationRepeater.collection.raw().filter(function (relation) {
    		return relation.value && /\S/.test(relation.value);
    	});

		// account fields for contact records
    	var accountCtrl = this.$.accountPicker.get("selected") || {};
    	
		this.doSave({oldPerson: this.oldPerson, newPerson: this.newPerson, accountId: accountCtrl.accountId, dbkind: accountCtrl.dbkind});
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
		this.newPerson.set("name", {honorificPrefix: honorificPrefix, givenName: givenName, middleName: middleName, familyName: familyName, honorificSuffix: honorificSuffix});
		// We use set, so displayName is updated
    },
    
    // Add common honorifics for all languages and cultures to this pattern.
    // Don't bother with noble honorifics.
	prefixPatt: /^((Mr\.|Master|Ms\.|Mrs\.|Miss|Dr\.|(The\s+)?Reverend|Father|(The\s+)Hon(\.|orable)|Herr|Frau|Fräulein|Doktor|Professor)\s*)+/ig,
	suffixPatt: /(,\s*(Ph\. ?D\.?|Junior|Jr\.|II|III|jünger))+$/i
});

//Contacts List
enyo.kind({
    name: "ContactItem",
    published: {
        icon: {
            src: "",
            showing: false
        }
    },
    components: [
        //{ name: "profilePicture", kind: "Image", src: "assets/bg_icon_img.png" },
        { classes: "icon", components: [
            { name: "photo", classes: "img" },
            { classes: "mask"}
        ] },
        { name: "name", content: "Name Name", classes: "name" },
        { name: "specialIcon", kind: "onyx.Icon", showing: false }
    ]
});


enyo.kind({
    name: "ContactsList",
    classes: "contacts-list", 
    kind: "enyo.List",
    count: 12,
    item: "item",
    components: [
        { name: "item", kind: "ContactItem", classes: "contacts-item" }
    ]
});


enyo.kind({
    name: "TabsControl",
    kind: "FittableRows",
    style: "text-align:center;",
    published: {
        panes: ""
    },
    components: [
        { name: "tabsToolbar", kind: "onyx.Toolbar", components: [
            { name: "tabs", kind: "onyx.RadioGroup", controlClasses: "onyx-tabbutton", onActivate: "paneChange", components: [
                { name: "0", content: "All", index: 0, active: true },
                { name: "1", content: "Favourites", index: 1 }
            ]}
        ]},
        { name: "panes", kind: "enyo.Panels", arrangerKind: "enyo.LeftRightArranger", onTransitionFinish: "tabChange", onTransitionStart: "tabChange", margin: 0, fit: true, components: [
            { name: "main", description: "All", kind: "FittableRows",  classes: "contacts-list", components: [
                { kind: "onyx.InputDecorator", classes: "contacts-search", components: [
				    { kind: "onyx.Input", placeholder: "Search" },
				    { kind: "Image", src: "assets/search-input.png" }
                ]},
                { kind: "ContactsList" , fit: true}
            ]},
            //Scroller is going crazy without the FittableRows
            { name: "favourites", description: "Favourites", kind: "FittableRows",  classes: "contacts-list", components: [
                { kind: "ContactsList", fit: true }
            ]}
        ],  
        }
    ],
    
    paneChange: function(inSender, inEvent) {
        if (inEvent.originator.getActive()) {
            //Is this okay, without index being published?
            this.$.panes.setIndex(inEvent.originator.index);
        }
    },
    
    tabChange: function(inSender, inEvent) {
        this.$[inEvent.toIndex].setActive(true);
    }
});


enyo.kind({
    name: "ContactsBar",
    kind: "FittableRows",
    components: [
        { kind: "TabsControl", fit: true, panes: [
            
            { name: "main", description: "All", kind: "FittableRows", components: [
                {kind: "onyx.InputDecorator", components: [
				    {kind: "onyx.Input", placeholder: "Search"},
				    {kind: "Image", src: "assets/search-icon.png"}
                ]},
                { kind: "ContactsList" , fit: true}
            ]},
            
            { name: "favourites", description: "Favourites", components: [
                { kind: "ContactsList" }
            ]}
        ]}
        
    ]
});

//Contact Details
enyo.kind({
    name: "Detail",
    components: [
        { tag: "p", name: "value", classes: "value", content: "joe@dude.com" },
        { tag: "p", name: "label", classes: "label", content: "Work Email" }
    ]
});


enyo.kind({
    name: "Header",
    kind: "enyo.FittableRows",
    classes: "header",
    components: [
        { kind: "enyo.FittableColumns", fit: true, components: [
            //{ name: "profilePicture", kind: "enyo.Image" },
            { classes: "avatar", components: [
                { name: "photo", classes: "img" },
                { classes: "mask"}
            ]},
            { classes: "nameinfo", fit: true, components: [
                { name: "name", classes: "name", content: "Joey Joe" },
                { name: "nickname", classes: "nickname", content: "JoJo" },
                { name: "job", classes: "position", content: "Joer, Job" }
            ]},
            { kind: "enyo.FittableRows", style: "text-align: right", components: [
                { name: "favourite", kind: "onyx.ToggleIconButton", classes: "favorite", src: "assets/bg_details_favorite.png" },
                { fit: true },
                { name: "profilesButton", classes: "profiles-button", kind: "onyx.Button", ontap: "openProfilesList", content: "2 Profiles" }
            ]}
        ]},
        { name: "profiles", kind: "onyx.Drawer", open: false, components: [
            { name: "profilesList", kind: "enyo.List", components: [
                { name: "profile", kind: "ContactItem" }
            ]},
            { name: "linkProfile", content: "Link More Profiles..." }
        ]}
    ],
    openProfilesList: function () {
        this.$.profiles.setOpen(!this.$.profiles.open);
        this.$.profilesButton.addRemoveClass("active", this.$.profiles.open);
    }
});

enyo.kind({
    name: "ContactDetails",
    kind: "enyo.Scroller",
    classes: "details",
    components: [ { name: "container", classes: "container", components: [
        { name: "content", classes: "content", components: [
            { name: "header", kind: "Header" },
            { name: "details", kind: "enyo.Repeater", classes: "group", count: 4, components: [
            { name: "contactDetail", kind: "Detail", classes: "contacts-item" }
            ] }
        ]}
    ]}
    ]
});


//App
enyo.kind({
    name: "App",
    kind: "FittableRows",
    components: [
        { name: "main", kind: "enyo.Panels", arrangerKind: "enyo.CollapsingArranger", draggable: false, fit: true, components: [
            { name: "bar", kind: "ContactsBar" },
            { name: "details", kind: "ContactDetails", fit: true }
        ]},
        { name: "BottomToolbar", kind: "onyx.Toolbar", components: [
            { kind: "onyx.Button", content: "Add Contact"}
        ]}
    ]
});

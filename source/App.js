//Contacts List
enyo.kind({
    name: "ContactItem",
    components: [
        { name: "profilePicture", kind: "Image" },
        { name: "name" }
    ]
});


enyo.kind({
    name: "ContactsList",
    kind: "enyo.List",
    components: [
        { name: "item", kind: "ContactItem" }
    ]
});


enyo.kind({
    name: "TabsControl",
    kind: "FittableRows",
    published: {
        panes: ""
    },
    components: [
        { kind: "enyo.RadioGroup" },
        { kind: "enyo.Panels", arrangerKind: "enyo.LeftRightArranger", margin: 0, fit: true }
    ]
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
        ]},
        
        { name: "BottomToolbar", kind: "onyx.Toolbar", components: [
            { kind: "onyx.Button", content: "Add Contact"}
        ]}
    ]
});

//Contact Details

//App
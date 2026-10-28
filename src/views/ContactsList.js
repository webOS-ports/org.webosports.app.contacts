var
    kind = require('enyo/kind'),
    DataList = require('enyo/DataList'),
    VerticalDelegate = require('enyo/VerticalDelegate'),
    ContactItem = require('./ContactItem');


var ContactsList = module.exports = kind({
    name: "ContactsList",
    classes: "contacts-list",
    kind: DataList,
    scrollerOptions: {
        horizontal: "hidden",
        touch: true
    },
    components: [
        {
            kind: ContactItem,
            classes: "contacts-item"
        }
    ]
});

// The DataList sizes its scroll area as (row height × rows), the row height
// measured from one page. Rows with a letter divider are taller, so with
// many groups the area came out short and the last rows could not be
// scrolled to. Make it reach at least the bottom of every page rendered,
// plus the rows after that page.
var delegate = ContactsList.delegates.vertical = Object.create(VerticalDelegate);
delegate.adjustBuffer = function (list) {
    VerticalDelegate.adjustBuffer.call(this, list);
    var n = list.$.buffer.node || list.$.buffer.hasNode(),
        count = list.collection ? list.collection.length : 0,
        rowSize = this.childSize(list),
        needed = list.bufferSize || 0;
    (list.pages || []).forEach(function (inPage) {
        var bottom = inPage[list.lowerProp];
        if (inPage.end >= inPage.start && bottom > 0) {
            needed = Math.max(needed, bottom + (count - 1 - inPage.end) * rowSize);
        }
    });
    if (n && needed > list.bufferSize) {
        list.bufferSize = needed;
        n.style[list.psizeProp] = needed + 'px';
        list.$.scroller.remeasure();
    }
};

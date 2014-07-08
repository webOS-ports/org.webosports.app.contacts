enyo.kind({
    name: "db8SourceMock",
    kind: "enyo.Source",

    fetch: function(rec, opts) {
        var i;
        console.log("==> Fetch called...");


        if (rec instanceof enyo.Model) {
            for (i = 0; i < this.dataArray.length(); i += 1) {
                if (this.dataArray[i]._id === rec.attributes[rec.primaryKey]) {
                    opts.success([this.dataArray[i]]);
                    return;
                }
            }

            //I think that is what db8 does, isn't it?
            opts.success([]);
        } else {
            //return all dataArray here:
            opts.success(this.dataArray);
        }
    },

    commit: function(rec, opts) {
        var i;
        console.log("Storing ", rec);

        if (rec instanceof enyo.Model) {
            for (i = 0; i < this.dataArray.length(); i += 1) {
                if (this.dataArray[i]._id === rec.attributes[rec.primaryKey]) {
                    this.dataArray[i] = rec.attributes;
                    opts.success({returnValue: true});
                    return;
                }
            }

            this.dataArray.push(rec.attributes);
            opts.success({returnValue: true});
        } else {
            console.log("Can't store collection... still makes me headaches.");
            opts.fail();
        }
    },
    destroy: function(rec, opts) {
        var ids;

        if (rec instanceof enyo.Collection) {
            ids = [];
            rec.records.forEach(function (m) {
                var i;
                for (i = this.dataArray.length - 1; i >= 0; i -= 1) {
                    if (this.dataArray[i]._id === m.attributes[m.primaryKey]) {
                        this.dataArray.splice(i, 1);
                    }
                }
            });
        } else {
            ids = [rec.attributes[rec.primaryKey]];
        }
    },
    find: function(rec, opts) {
        console.log("No find..");
        opts.fail();
    },
    getIds: function (n, opts) {
        var ids = [], i;
        for (i = 0; i < n; i += 1) {
            ids.push(Date.now() + i);
        }
        opts.success({returnValue: true, ids: [ids]});
    },



    dataArray: [

    ]
});

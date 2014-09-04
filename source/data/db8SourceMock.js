enyo.kind({
    name: "db8SourceMock",
    kind: "enyo.Source",

    fetch: function (rec, opts) {
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

    commit: function (rec, opts) {
        var i;
        console.log("Storing ", rec);

        if (rec instanceof enyo.Model) {
            for (i = 0; i < this.dataArray.length(); i += 1) {
                if (this.dataArray[i]._id === rec.attributes[rec.primaryKey]) {
                    this.dataArray[i] = rec.attributes;
                    opts.success({
                        returnValue: true
                    });
                    return;
                }
            }

            this.dataArray.push(rec.attributes);
            opts.success({
                returnValue: true
            });
        } else {
            console.log("Can't store collection... still makes me headaches.");
            opts.fail();
        }
    },
    destroy: function (rec, opts) {
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
    find: function (rec, opts) {
        console.log("No find..");
        opts.fail();
    },
    getIds: function (n, opts) {
        var ids = [],
            i;
        for (i = 0; i < n; i += 1) {
            ids.push(Date.now() + i);
        }
        opts.success({
            returnValue: true,
            ids: [ids]
        });
    },



    dataArray: [
        {
            "_id": "J1EcwkckJBw",
            "_kind": "com.palm.person:1",
            "_rev": 344,
            "addresses": [{
                "_id": "130",
                "country": "",
                "locality": "",
                "postalCode": "\\.. ",
                "primary": false,
                "region": "dassa'.,",
                "streetAddress": "Neueaddresse.:",
                "type": "type_work"
            }, {
                "_id": "131",
                "country": "",
                "locality": "",
                "postalCode": "",
                "primary": false,
                "region": "",
                "streetAddress": "., ",
                "type": "type_home"
            }, {
                "_id": "12c",
                "country": "USE",
                "locality": "",
                "postalCode": "",
                "primary": false,
                "region": "somewhere.m irgendwo",
                "streetAddress": "",
                "type": "type_work"
            }],
            "anniversary": "",
            "birthday": "2014-07-12",
            "contactIds": ["J1EcwYUFwGV", "J1EcwYUFYEg"],
            "emails": [{
                "_id": "132",
                "favoriteData": {},
                "normalizedValue": "test@blub.de",
                "primary": false,
                "type": "type_work",
                "value": "test@blub.de"
            }],
            "favorite": false,
            "gender": "",
            "ims": [],
            "launcherId": "",
            "name": {
                "familyName": "schlubbeltub",
                "givenName": "test-zu-owo",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            },
            "names": [{
                "_id": "159",
                "familyName": "schlubbeltub",
                "givenName": "test-zu-owo",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            }, {
                "_id": "15a",
                "familyName": "",
                "givenName": "test-zu-owo",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            }],
            "nickname": "",
            "notes": [",.öäü\\?ß!\"&lt;&gt;&amp; does this read ok?"],
            "organization": {
                "department": "",
                "description": "",
                "endDate": "",
                "location": {
                    "country": "",
                    "locality": "",
                    "postalCode": "",
                    "primary": false,
                    "region": "",
                    "streetAddress": "",
                    "type": "type_work"
                },
                "name": "",
                "startDate": "",
                "title": "",
                "type": ""
            },
            "phoneNumbers": [],
            "photos": {
                "accountId": "",
                "bigPhotoId": "",
                "bigPhotoPath": "",
                "contactId": "",
                "listPhotoPath": "",
                "listPhotoSource": "",
                "squarePhotoId": "",
                "squarePhotoPath": ""
            },
            "relations": [{
                "_id": "133",
                "primary": false,
                "type": "type_spouse",
                "value": "Test spiuse"
            }, {
                "_id": "134",
                "primary": false,
                "type": "type_child",
                "value": "Test child"
            }],
            "reminder": "",
            "ringtone": {
                "location": "",
                "name": ""
            },
            "searchTerms": ["tschlubbeltub", "schlubbeltubtest-zu-owo"],
            "sortKey": "schlubbeltub\ttest-zu-owo",
            "urls": [{
                "_id": "135",
                "primary": false,
                "type": "type_other",
                "value": "Https://scrounge.dumpf"
            }, {
                "_id": "12e",
                "primary": false,
                "type": "type_other",
                "value": "http://workurl.de"
            }]
        }, {
            "_id": "J1EcwpjkP_k",
            "_kind": "com.palm.person:1",
            "_rev": 347,
            "addresses": [],
            "anniversary": "",
            "birthday": "",
            "contactIds": ["J1EcwYUG8r3"],
            "emails": [],
            "favorite": false,
            "gender": "",
            "ims": [],
            "launcherId": "",
            "name": {
                "familyName": "Anders",
                "givenName": "Was",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": "Gaaaanz"
            },
            "names": [{
                "_id": "15c",
                "familyName": "Anders",
                "givenName": "Was",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": "Gaaaanz"
            }],
            "nickname": "Nick.",
            "notes": [],
            "organization": {
                "department": "",
                "description": "",
                "endDate": "",
                "location": {
                    "country": "",
                    "locality": "",
                    "postalCode": "",
                    "primary": false,
                    "region": "",
                    "streetAddress": "",
                    "type": "type_work"
                },
                "name": "",
                "startDate": "",
                "title": "",
                "type": ""
            },
            "phoneNumbers": [{
                "_id": "137",
                "favoriteData": {},
                "normalizedValue": "-0989898989898-898--",
                "primary": false,
                "speedDial": "",
                "type": "type_mobile",
                "value": "8988989898989890"
            }, {
                "_id": "138",
                "favoriteData": {},
                "normalizedValue": "-6543643253465345324-123--",
                "primary": false,
                "speedDial": "",
                "type": "type_mobile",
                "value": "13214235435643523463456"
            }],
            "photos": {
                "accountId": "",
                "bigPhotoId": "",
                "bigPhotoPath": "",
                "contactId": "",
                "listPhotoPath": "",
                "listPhotoSource": "",
                "squarePhotoId": "",
                "squarePhotoPath": ""
            },
            "relations": [],
            "reminder": "",
            "ringtone": {
                "location": "",
                "name": ""
            },
            "searchTerms": ["wanders", "anderswas"],
            "sortKey": "anders\twas",
            "urls": []
        }, {
            "_id": "J1Ecws+LFLJ",
            "_kind": "com.palm.person:1",
            "_rev": 352,
            "addresses": [],
            "anniversary": "",
            "birthday": "",
            "contactIds": ["J1EcwYUGPKN"],
            "emails": [{
                "_id": "13a",
                "favoriteData": {},
                "normalizedValue": "blabbel@test.nix",
                "primary": false,
                "type": "type_home",
                "value": "blabbel@test.nix"
            }],
            "favorite": false,
            "gender": "",
            "ims": [],
            "launcherId": "",
            "name": {
                "familyName": "Hoch",
                "givenName": "Test",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            },
            "names": [{
                "_id": "161",
                "familyName": "Hoch",
                "givenName": "Test",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            }],
            "nickname": "",
            "notes": [],
            "organization": {
                "department": "",
                "description": "",
                "endDate": "",
                "location": {
                    "country": "",
                    "locality": "",
                    "postalCode": "",
                    "primary": false,
                    "region": "",
                    "streetAddress": "",
                    "type": "type_work"
                },
                "name": "",
                "startDate": "",
                "title": "",
                "type": ""
            },
            "phoneNumbers": [],
            "photos": {
                "accountId": "",
                "bigPhotoId": "",
                "bigPhotoPath": "",
                "contactId": "",
                "listPhotoPath": "",
                "listPhotoSource": "",
                "squarePhotoId": "",
                "squarePhotoPath": ""
            },
            "relations": [],
            "reminder": "",
            "ringtone": {
                "location": "",
                "name": ""
            },
            "searchTerms": ["thoch", "hochtest"],
            "sortKey": "hoch\ttest",
            "urls": []
        }, {
            "_id": "J1EcwtI22Yc",
            "_kind": "com.palm.person:1",
            "_rev": 354,
            "addresses": [],
            "anniversary": "",
            "birthday": "",
            "contactIds": ["J1EcwYUGjSR"],
            "emails": [],
            "favorite": false,
            "gender": "",
            "ims": [],
            "launcherId": "",
            "name": {
                "familyName": "runter",
                "givenName": "test",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            },
            "names": [{
                "_id": "163",
                "familyName": "runter",
                "givenName": "test",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            }],
            "nickname": "",
            "notes": [],
            "organization": {
                "department": "",
                "description": "",
                "endDate": "",
                "location": {
                    "country": "",
                    "locality": "",
                    "postalCode": "",
                    "primary": false,
                    "region": "",
                    "streetAddress": "",
                    "type": "type_work"
                },
                "name": "",
                "startDate": "",
                "title": "",
                "type": ""
            },
            "phoneNumbers": [{
                "_id": "13c",
                "favoriteData": {},
                "normalizedValue": "-324435435-688--",
                "primary": false,
                "speedDial": "",
                "type": "type_home",
                "value": "886534534423"
            }],
            "photos": {
                "accountId": "",
                "bigPhotoId": "",
                "bigPhotoPath": "",
                "contactId": "",
                "listPhotoPath": "",
                "listPhotoSource": "",
                "squarePhotoId": "",
                "squarePhotoPath": ""
            },
            "relations": [],
            "reminder": "",
            "ringtone": {
                "location": "",
                "name": ""
            },
            "searchTerms": ["trunter", "runtertest"],
            "sortKey": "runter\ttest",
            "urls": []
        }, {
            "_id": "J1EcwuraPig",
            "_kind": "com.palm.person:1",
            "_rev": 356,
            "addresses": [],
            "anniversary": "",
            "birthday": "",
            "contactIds": ["J1EcwYUGWgF"],
            "emails": [{
                "_id": "13e",
                "favoriteData": {},
                "normalizedValue": "adashakdasd@ada.eqaeaw",
                "primary": false,
                "type": "type_home",
                "value": "adashakdasd@ada.eqaeaw"
            }],
            "favorite": false,
            "gender": "",
            "ims": [],
            "launcherId": "",
            "name": {
                "familyName": "kopf",
                "givenName": "nupf",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            },
            "names": [{
                "_id": "165",
                "familyName": "kopf",
                "givenName": "nupf",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            }],
            "nickname": "",
            "notes": [],
            "organization": {
                "department": "",
                "description": "",
                "endDate": "",
                "location": {
                    "country": "",
                    "locality": "",
                    "postalCode": "",
                    "primary": false,
                    "region": "",
                    "streetAddress": "",
                    "type": "type_work"
                },
                "name": "",
                "startDate": "",
                "title": "",
                "type": ""
            },
            "phoneNumbers": [],
            "photos": {
                "accountId": "",
                "bigPhotoId": "",
                "bigPhotoPath": "",
                "contactId": "",
                "listPhotoPath": "",
                "listPhotoSource": "",
                "squarePhotoId": "",
                "squarePhotoPath": ""
            },
            "relations": [],
            "reminder": "",
            "ringtone": {
                "location": "",
                "name": ""
            },
            "searchTerms": ["nkopf", "kopfnupf"],
            "sortKey": "kopf\tnupf",
            "urls": []
        }, {
            "_id": "J1EcwwUH33V",
            "_kind": "com.palm.person:1",
            "_rev": 358,
            "addresses": [],
            "anniversary": "",
            "birthday": "",
            "contactIds": ["J1EcwYUGmPo"],
            "emails": [],
            "favorite": false,
            "gender": "",
            "ims": [],
            "launcherId": "",
            "name": {
                "familyName": "Njam",
                "givenName": "Njam",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            },
            "names": [{
                "_id": "167",
                "familyName": "Njam",
                "givenName": "Njam",
                "honorificPrefix": "",
                "honorificSuffix": "",
                "middleName": ""
            }],
            "nickname": "",
            "notes": [],
            "organization": {
                "department": "",
                "description": "",
                "endDate": "",
                "location": {
                    "country": "",
                    "locality": "",
                    "postalCode": "",
                    "primary": false,
                    "region": "",
                    "streetAddress": "",
                    "type": "type_work"
                },
                "name": "",
                "startDate": "",
                "title": "",
                "type": ""
            },
            "phoneNumbers": [{
                "_id": "140",
                "favoriteData": {},
                "normalizedValue": "-098797898779808-708--",
                "primary": false,
                "speedDial": "",
                "type": "type_mobile",
                "value": "8-0780897789879--7890"
            }],
            "photos": {
                "accountId": "",
                "bigPhotoId": "",
                "bigPhotoPath": "",
                "contactId": "",
                "listPhotoPath": "",
                "listPhotoSource": "",
                "squarePhotoId": "",
                "squarePhotoPath": ""
            },
            "relations": [],
            "reminder": "",
            "ringtone": {
                "location": "",
                "name": ""
            },
            "searchTerms": ["nnjam", "njamnjam"],
            "sortKey": "njam\tnjam",
            "urls": []
        }
    ]
});

org.webosports.app.contacts
===========================

The Contacts (address book) app for Lune OS, rewritten with Enyo 2.
Typically, most data is supplied by Synergy Connectors, but it also allows local editing.

## Building/Installation

You can develop in the browser like a normal Enyo 2 app - 
Contacts will use the data in db8SourceMock.js and the mock directory.


## Contributing

If you want to contribute you can just start with cloning the repository and make your contributions. 
We're using a pull-request based development and utilizing github for the management of those. 
All developers must provide their contributions as pull-request and github and at least one of the core developers needs to approve the pull-request before it can be merged.

Please refer to http://www.webos-ports.org/wiki/Communications for information about how to contact the developers of this project.

## API exposed to other apps
luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts", "params": {"launchType": "newContact", "contact": {"nickname": "Madoka"}}}'

see http://www.openwebosproject.org/docs/developer_reference/application_apis/add_contact/

## TODO
* contact details displays address with locality, region, country and postal code on separate lines
* contact details doesn't display type "other" for IM addr
* locale-specific code to parse a single address field into DB fields
* edit name components
* type of new phone, IM, address or relation should be different than existing
* fix race condition between launchParam & accountPicker
* allow deleting records
* edit photos
* edit ringtones
* request dialing phone number
* request sending email
* request sending IM
* request open browser to URL
* display and edit notes as single concatenated field
* replace account picker in EditContact w/ icon btn & custom Menu
* re-think edit & detail layout to work properly on both phone- and tablet-sized screens
* handle users w/ more than 500 contacts (probably by loading them all into GlobalPersonCollection)
* when user is edited, make the list of linked contacts update


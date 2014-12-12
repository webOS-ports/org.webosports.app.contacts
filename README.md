org.webosports.app.contacts
===========================

The Contacts app for webOS Ports, built with Enyo2.

You can develop in the browser like a normal Enyo 2 app - Contacts
will use the data in db8SourceMock.js

When you're ready to install to a device, run `tools/deploy.sh -i`
(Luna-Next will restart)

TODO:
* save new contact to DB8
* locale-specific code to parse a single address field into DB fields
* edit relations
* edit ringtones
* db watches (currently => need to restart to get fresh data)
* allow contact editing
* request dialing phone number
* request sending email
* request sending IM
* request open browser to URL

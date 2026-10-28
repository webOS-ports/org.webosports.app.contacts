/*
	Drives headless Chromium over the DevTools protocol (Node 22+, no npm
	packages).

		var browser = await require("./lib/browser.js").launch();
		var page = await browser.newPage({width: 480, height: 800,
			initScripts: [mockSource], geolocation: {latitude, longitude}});
		await page.goto(url);
		await page.waitFor("window.weatherApp && weatherApp.lastJson");
		var text = await page.eval("document.title");
		await page.tap(".header .icon");          // real mouse events, so enyo sees a tap
		await page.screenshot("test-output/shots/x.png");
		page.errors                                // uncaught exceptions + console.error
		await browser.close();

	Chromium is started with --remote-debugging-port=0 and a profile of its
	own under test-output/, and the actual port is read back from the profile's
	DevToolsActivePort file, so parallel runs (and other agents' browsers)
	never collide. CHROME=<path> picks the binary; otherwise the usual names
	are tried.
*/
var spawn = require("child_process").spawn;
var execSync = require("child_process").execSync;
var fs = require("fs");
var path = require("path");

function sleep(inMs) {
	return new Promise(function(r) { setTimeout(r, inMs); });
}

function findChrome() {
	if (process.env.CHROME) {
		return process.env.CHROME;
	}
	var names = ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "/snap/bin/chromium"];
	for (var i = 0; i < names.length; i++) {
		try {
			return execSync("command -v " + names[i], {stdio: ["ignore", "pipe", "ignore"]}).toString().trim();
		} catch (e) {}
	}
	throw new Error("No Chromium found; set CHROME=/path/to/chromium");
}

async function launch(inOptions) {
	inOptions = inOptions || {};
	// Under the checkout, not /tmp: snap's Chromium cannot write to /tmp of
	// the host, and a profile in test-output/ is easy to find when a run fails.
	var profile = path.resolve(inOptions.profileDir ||
		path.join(__dirname, "..", "..", "..", "test-output", "profile-" + process.pid));
	fs.rmSync(profile, {recursive: true, force: true});
	fs.mkdirSync(profile, {recursive: true});
	var proc = spawn(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox", "--no-first-run",
		"--remote-debugging-port=0", "--user-data-dir=" + profile, "--window-size=1024,768", "about:blank"],
		{stdio: "ignore"});
	var portFile = path.join(profile, "DevToolsActivePort");
	var port = null;
	for (var i = 0; i < 100 && !port; i++) {
		await sleep(100);
		try {
			port = +fs.readFileSync(portFile, "utf8").split("\n")[0];
		} catch (e) {}
	}
	if (!port) {
		proc.kill();
		throw new Error("Chromium did not start (no " + portFile + ")");
	}
	var base = "http://127.0.0.1:" + port;

	return {
		newPage: function(inPageOptions) {
			return newPage(base, inPageOptions || {});
		},
		close: async function() {
			proc.kill();
			await sleep(300);
			fs.rmSync(profile, {recursive: true, force: true});
		}
	};
}

async function newPage(inBase, inOptions) {
	var target = await (await fetch(inBase + "/json/new?about:blank", {method: "PUT"})).json();
	var ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise(function(r, j) { ws.onopen = r; ws.onerror = j; });
	var id = 0, pending = {};
	var page = {errors: [], console: []};

	ws.onmessage = function(m) {
		var msg = JSON.parse(m.data);
		if (msg.id && pending[msg.id]) {
			var p = pending[msg.id];
			delete pending[msg.id];
			if (msg.error) {
				p.reject(new Error(msg.error.message));
			} else {
				p.resolve(msg.result);
			}
		} else if (msg.method === "Runtime.exceptionThrown") {
			var d = msg.params.exceptionDetails;
			page.errors.push((d.exception && d.exception.description) || d.text);
		} else if (msg.method === "Runtime.consoleAPICalled") {
			var text = msg.params.args.map(function(a) { return a.value !== undefined ? a.value : a.description; }).join(" ");
			page.console.push(msg.params.type + ": " + text);
			if (msg.params.type === "error") {
				page.errors.push("console.error: " + text);
			}
		}
	};

	function send(inMethod, inParams) {
		return new Promise(function(resolve, reject) {
			pending[++id] = {resolve: resolve, reject: reject};
			ws.send(JSON.stringify({id: id, method: inMethod, params: inParams || {}}));
		});
	}
	page.send = send;

	await send("Runtime.enable");
	await send("Page.enable");
	await send("Emulation.setDeviceMetricsOverride", {width: inOptions.width || 480, height: inOptions.height || 800,
		deviceScaleFactor: 1, mobile: false});
	if (inOptions.geolocation) {
		await send("Browser.grantPermissions", {permissions: ["geolocation"]});
		await send("Emulation.setGeolocationOverride", Object.assign({accuracy: 50}, inOptions.geolocation));
	}
	if (inOptions.locale) {
		await send("Emulation.setLocaleOverride", {locale: inOptions.locale});
	}
	var scripts = inOptions.initScripts || [];
	for (var i = 0; i < scripts.length; i++) {
		await send("Page.addScriptToEvaluateOnNewDocument", {source: scripts[i]});
	}

	//* Evaluates an expression (a promise is awaited) and returns its value.
	page.eval = async function(inExpression) {
		var r = await send("Runtime.evaluate", {expression: inExpression, returnByValue: true, awaitPromise: true});
		if (r.exceptionDetails) {
			throw new Error("eval failed: " + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) ||
				r.exceptionDetails.text) + "\n  in: " + inExpression);
		}
		return r.result.value;
	};

	//* Polls until the expression is truthy; returns its value.
	page.waitFor = async function(inExpression, inTimeout) {
		var until = Date.now() + (inTimeout || 10000), last;
		while (Date.now() < until) {
			try {
				last = await page.eval(inExpression);
				if (last) {
					return last;
				}
			} catch (e) {
				last = e.message;
			}
			await sleep(100);
		}
		throw new Error("timed out waiting for: " + inExpression + " (last: " + JSON.stringify(last) + ")");
	};

	page.goto = async function(inUrl) {
		page.errors.length = 0;
		await send("Page.navigate", {url: inUrl});
		await page.waitFor("document.readyState === 'complete'", 15000);
	};

	page.reload = async function() {
		page.errors.length = 0;
		await send("Page.reload", {ignoreCache: true});
		await sleep(200);
		await page.waitFor("document.readyState === 'complete'", 15000);
	};

	//* Center of the first element matching a CSS selector, or null when hidden.
	page.center = function(inSelector) {
		return page.eval("(function(){var e=document.querySelector(" + JSON.stringify(inSelector) + ");" +
			"if(!e)return null;var r=e.getBoundingClientRect();if(!r.width||!r.height)return null;" +
			"return {x:r.left+r.width/2,y:r.top+r.height/2};})()");
	};

	//* A real press and release at the element, as a finger would.
	page.tap = async function(inSelector) {
		var c = await page.waitFor("(function(){var e=document.querySelector(" + JSON.stringify(inSelector) + ");" +
			"if(!e)return null;var r=e.getBoundingClientRect();if(!r.width||!r.height)return null;" +
			"return {x:r.left+r.width/2,y:r.top+r.height/2};})()", 5000);
		await send("Input.dispatchMouseEvent", {type: "mouseMoved", x: c.x, y: c.y});
		await send("Input.dispatchMouseEvent", {type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1});
		await send("Input.dispatchMouseEvent", {type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1});
		await sleep(50);
	};

	//* Taps the first element matching inSelector whose text contains inText.
	page.tapText = async function(inSelector, inText) {
		var c = await page.waitFor("(function(){var l=document.querySelectorAll(" + JSON.stringify(inSelector) + ");" +
			"for(var i=0;i<l.length;i++){var e=l[i];if((e.textContent||'').indexOf(" + JSON.stringify(inText) + ")<0)continue;" +
			"var r=e.getBoundingClientRect();if(!r.width||!r.height)continue;" +
			"return {x:r.left+r.width/2,y:r.top+r.height/2};}return null;})()", 5000);
		await page.tapAt(c);
	};

	page.tapAt = async function(c) {
		await send("Input.dispatchMouseEvent", {type: "mouseMoved", x: c.x, y: c.y});
		await send("Input.dispatchMouseEvent", {type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1});
		await send("Input.dispatchMouseEvent", {type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1});
		await sleep(50);
	};

	/**
		Replaces the value of the input or textarea matching inSelector by
		typing, then leaves the field, so the app sees input and change
		events as from a keyboard.
	*/
	page.fill = async function(inSelector, inText) {
		await page.waitFor("(function(){var e=document.querySelector(" + JSON.stringify(inSelector) + ");" +
			"if(!e)return false;e.focus();e.select&&e.select();return document.activeElement===e;})()", 5000);
		if (inText) {
			await send("Input.insertText", {text: inText});
		} else {
			await page.key("Backspace");
		}
		await page.eval("(function(){var e=document.querySelector(" + JSON.stringify(inSelector) + ");e.blur();})()");
		await sleep(50);
	};

	/**
		A finger drag from one point to another in inSteps moves. With
		inHold the finger stays down at the end (page.release() lifts it),
		so a test can look at the page mid-drag.
	*/
	page.drag = async function(inFrom, inTo, inSteps, inHold) {
		var steps = inSteps || 10;
		await send("Input.dispatchMouseEvent", {type: "mouseMoved", x: inFrom.x, y: inFrom.y});
		await send("Input.dispatchMouseEvent", {type: "mousePressed", x: inFrom.x, y: inFrom.y, button: "left", clickCount: 1});
		for (var i = 1; i <= steps; i++) {
			page.lastPointer = {x: inFrom.x + (inTo.x - inFrom.x) * i / steps, y: inFrom.y + (inTo.y - inFrom.y) * i / steps};
			await send("Input.dispatchMouseEvent", {type: "mouseMoved", x: page.lastPointer.x, y: page.lastPointer.y,
				button: "left", buttons: 1});
			await sleep(16);
		}
		if (!inHold) {
			await page.release();
		}
	};

	page.release = async function() {
		var p = page.lastPointer;
		await send("Input.dispatchMouseEvent", {type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1});
		await sleep(50);
	};

	page.type = async function(inText) {
		await send("Input.insertText", {text: inText});
	};

	//* "Escape", "Enter", ...
	page.key = async function(inKey) {
		var codes = {Escape: 27, Enter: 13, Backspace: 8, ArrowDown: 40, ArrowUp: 38};
		var base = {key: inKey, code: inKey, windowsVirtualKeyCode: codes[inKey], nativeVirtualKeyCode: codes[inKey]};
		await send("Input.dispatchKeyEvent", Object.assign({type: "keyDown"}, base));
		await send("Input.dispatchKeyEvent", Object.assign({type: "keyUp"}, base));
	};

	page.screenshot = async function(inFile) {
		var shot = await send("Page.captureScreenshot", {format: "png"});
		fs.mkdirSync(path.dirname(inFile), {recursive: true});
		fs.writeFileSync(inFile, Buffer.from(shot.data, "base64"));
		return inFile;
	};

	page.close = async function() {
		try {
			await fetch(inBase + "/json/close/" + target.id);
		} catch (e) {}
		ws.close();
	};

	return page;
}

module.exports = {launch: launch, sleep: sleep};

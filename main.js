// var dgram = require("dgram");
var crypto = require("crypto");
var colors = require("colors");
var fsCache = require("./fs-cache");
var spawn = require('child_process').spawn;

var CACHE = {};

var computeHash = function(info) {
		var src = JSON.stringify(info),
			sha1Hash = crypto.createHash("sha1");

		sha1Hash.update(src);

		return sha1Hash.digest("hex");
	};

var dns = require('native-dns'),
	server = dns.createServer();

server.on('request', function(request, response) {
	var question = request.question;
	console.log(("Question: ").cyan + JSON.stringify(question));

	var cacheKey = computeHash(question);
	// console.log(cacheKey);

	var cachedAnswer = fsCache.getSync(cacheKey);

	if (cachedAnswer !== null) {
		// use cache
		console.log("serving from cache!");

		cachedAnswer.hits++;
		cachedAnswer.last = new Date();

		console.log("cache hits " + cachedAnswer.hits);

		cachedAnswer.answers.forEach(function(a) {
			response.answer.push(a);
		});

		response.send();

		// set back with updated value
		fsCache.set(cacheKey, cachedAnswer);

		console.log(("Served by cache.").green);
		console.log("Cached items: " + CACHE.length);
	} else {
		var proxy = dns.Request({
			question: question[0],
			server: {
				address: '172.25.4.21',
				port: 53,
				type: 'udp'
			},
			timeout: 2000,
			cache: false
		});

		proxy.on('timeout', function() {
			console.log(('Timeout in making request').yellow);
		});

		proxy.on('message', function(err, proxyResponse) {
			var answers = [];

			proxyResponse.answer.forEach(function(a) {
				answers.push(a);
				response.answer.push(a);
			});

			response.send();

			fsCache.set(cacheKey, {
				"when": new Date(),
				"last": new Date(),
				"hits": 0,
				"answers": answers
			});

			console.log(("Served by upstream.").red);
		});

		proxy.send();
	}
});

server.on('error', function(err, buff, req, res) {
	console.log((err.stack).red);
});

CACHE.length = 0;

server.serve(53);
console.log(("NLTD DNS Relay Server started.").green);

// do constant ping
var ping = spawn('ping', ['172.25.4.21', '-t']);
var pingResultStream = "";
var skipped = 0;

ping.stdout.on('data', function (data) {
	var dataString = data.toString();
	if (dataString.indexOf("\r\n") >= 0) {
		// skip first 2 lines
		if (skipped <= 2) {
			skipped	++;
			return;
		}

		pingResultStream += dataString;
		var pingResult = pingResultStream;
		pingResultStream = "";
		// analyze
		// console.log(pingResult);
		if (/time\=\d+ms/.test(pingResult)) {
			if (Math.random() > 0.75) {
				console.log((">> DNS is working").green);
			}
		} else {
			console.log((">> DNS is down").red);
		}
	} else {
		pingResultStream += dataString;
		// console.log("HALF ");
	}
	// console.log(data.toString()); // + "->" + data.toString().indexOf("\r\n"));
});

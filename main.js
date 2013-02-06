// var dgram = require("dgram");
var crypto = require("crypto");
var colors = require("colors");

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

	if (CACHE[cacheKey] !== undefined) {
		// use cache
		console.log("serving from cache!");
		var cachedItem = CACHE[cacheKey];

		cachedItem.hits++;
		console.log("cache hits " + cachedItem.hits);

		cachedItem.answers.forEach(function(a) {
			response.answer.push(a);
		});

		response.send();
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
			timeout: 5000,
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

			CACHE[cacheKey] = {
				"when": new Date(),
				"hits": 0,
				"answers": answers
			};
			CACHE.length++;
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
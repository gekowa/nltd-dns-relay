var cachePath = __dirname + "/!CACHE/";
var fs = require("fs");

module.exports.set = function(key, object) {
	fs.writeFileSync(cachePath + key, JSON.stringify(object), "utf8");
};

module.exports.getSync = function(key) {
	if (fs.existsSync(cachePath + key)) {
		var content = fs.readFileSync(cachePath + key, "utf8");
		return JSON.parse(content);
	} else {
		return null;
	}
};


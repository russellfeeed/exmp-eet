(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var DDP = Package.livedata.DDP;
var DDPServer = Package.livedata.DDPServer;

/* Package-scope variables */
var headers;

(function () {

////////////////////////////////////////////////////////////////////////
//                                                                    //
// packages/headers/headers-common.js                                 //
//                                                                    //
////////////////////////////////////////////////////////////////////////
                                                                      //
headers = {                                                           // 1
	list: {},                                                            // 2
	proxyCount: 0,                                                       // 3
	get: function(header) {                                              // 4
		return header ? this.list[header] : this.list;                      // 5
	},                                                                   // 6
	getClientIP: function(proxyCount) {                                  // 7
		var chain = this.list['x-ip-chain'].split(',');                     // 8
		if (typeof(proxyCount) == 'undefined')                              // 9
			proxyCount = this.proxyCount;                                      // 10
		return chain[chain.length - proxyCount - 1];                        // 11
	},                                                                   // 12
	setProxyCount: function(proxyCount) {                                // 13
		this.proxyCount = proxyCount;                                       // 14
	},                                                                   // 15
	getProxyCount: function() {                                          // 16
		return this.proxyCount;                                             // 17
	}                                                                    // 18
}                                                                     // 19
                                                                      // 20
////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////
//                                                                    //
// packages/headers/headers-server.js                                 //
//                                                                    //
////////////////////////////////////////////////////////////////////////
                                                                      //
var app = typeof WebApp != 'undefined'                                // 1
  ? WebApp.connectHandlers : __meteor_bootstrap__.app;                // 2
app.use(function(req, res, next) {                                    // 3
  headers.list = req.headers;                                         // 4
                                                                      // 5
  // freebie :)                                                       // 6
  var ipChain = [];                                                   // 7
  if (headers.list['x-forwarded-for'])                                // 8
    _.each(headers.list['x-forwarded-for'].split(','), function(ip) { // 9
      ipChain.push(ip.replace('/\s*/g', ''));                         // 10
    });                                                               // 11
  if (ipChain.length == 0                                             // 12
      || ipChain[ipChain.length-1] != req.connection.remoteAddress)   // 13
    ipChain.push(req.connection.remoteAddress);                       // 14
  headers.list['x-ip-chain'] = ipChain.join(',');                     // 15
                                                                      // 16
  return next();                                                      // 17
});                                                                   // 18
                                                                      // 19
Meteor.methods({                                                      // 20
    'getReqHeader': function(header) {                                // 21
    	return headers.list[header];                                     // 22
    },                                                                // 23
    'getReqHeaders': function() {                                     // 24
    	return headers.list;                                             // 25
    }                                                                 // 26
});                                                                   // 27
                                                                      // 28
////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.headers = {
  headers: headers
};

})();

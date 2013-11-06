(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/cfs-public-folder/cfs-public-folder.js                   //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
var connect = Npm.require('connect');                                // 1
var path = Npm.require('path');                                      // 2
                                                                     // 3
var bundleRoot = path.join(process.mainModule.filename, '..');       // 4
var rootDir = path.join(bundleRoot, '..') + path.sep;                // 5
var serverPath = path.join(rootDir, 'cfs');                          // 6
                                                                     // 7
var webPath = "/cfs";                                                // 8
                                                                     // 9
RoutePolicy.declare(webPath, 'network');                             // 10
                                                                     // 11
WebApp                                                               // 12
	.connectHandlers                                                    // 13
	.use(                                                               // 14
	 	webPath,                                                          // 15
		connect.static(serverPath)                                         // 16
	);                                                                  // 17
                                                                     // 18
                                                                     // 19
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['cfs-public-folder'] = {};

})();

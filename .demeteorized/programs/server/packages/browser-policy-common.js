(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;

/* Package-scope variables */
var BrowserPolicy;

(function () {

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/browser-policy-common/browser-policy-common.js                //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
BrowserPolicy = {};                                                       // 1
                                                                          // 2
var inTest = false;                                                       // 3
                                                                          // 4
BrowserPolicy._runningTest = function () {                                // 5
  return inTest;                                                          // 6
};                                                                        // 7
                                                                          // 8
BrowserPolicy._setRunningTest = function () {                             // 9
  inTest = true;                                                          // 10
};                                                                        // 11
                                                                          // 12
WebApp.connectHandlers.use(function (req, res, next) {                    // 13
  // Never set headers inside tests because they could break other tests. // 14
  if (BrowserPolicy._runningTest())                                       // 15
    return next();                                                        // 16
                                                                          // 17
  var xFrameOptions = BrowserPolicy.framing &&                            // 18
        BrowserPolicy.framing._constructXFrameOptions();                  // 19
  var csp = BrowserPolicy.content &&                                      // 20
        BrowserPolicy.content._constructCsp();                            // 21
  if (xFrameOptions)                                                      // 22
    res.setHeader("X-Frame-Options", xFrameOptions);                      // 23
  if (csp)                                                                // 24
    res.setHeader("Content-Security-Policy", csp);                        // 25
  next();                                                                 // 26
});                                                                       // 27
                                                                          // 28
////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['browser-policy-common'] = {
  BrowserPolicy: BrowserPolicy
};

})();

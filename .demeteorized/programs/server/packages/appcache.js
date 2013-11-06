(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var _ = Package.underscore._;

(function () {

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/appcache/appcache-server.js                                        //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var crypto = Npm.require('crypto');                                            // 1
var fs = Npm.require('fs');                                                    // 2
var path = Npm.require('path');                                                // 3
                                                                               // 4
var knownBrowsers = [                                                          // 5
  'android',                                                                   // 6
  'chrome',                                                                    // 7
  'chromium',                                                                  // 8
  'chromeMobileIOS',                                                           // 9
  'firefox',                                                                   // 10
  'ie',                                                                        // 11
  'mobileSafari',                                                              // 12
  'safari'                                                                     // 13
];                                                                             // 14
                                                                               // 15
var browsersEnabledByDefault = [                                               // 16
  'android',                                                                   // 17
  'chrome',                                                                    // 18
  'chromium',                                                                  // 19
  'chromeMobileIOS',                                                           // 20
  'ie',                                                                        // 21
  'mobileSafari',                                                              // 22
  'safari'                                                                     // 23
];                                                                             // 24
                                                                               // 25
var enabledBrowsers = {};                                                      // 26
_.each(browsersEnabledByDefault, function (browser) {                          // 27
  enabledBrowsers[browser] = true;                                             // 28
});                                                                            // 29
                                                                               // 30
Meteor.AppCache = {                                                            // 31
  config: function(options) {                                                  // 32
    _.each(options, function (value, option) {                                 // 33
      if (option === 'browsers') {                                             // 34
        enabledBrowsers = {};                                                  // 35
        _.each(value, function (browser) {                                     // 36
          enabledBrowsers[browser] = true;                                     // 37
        });                                                                    // 38
      }                                                                        // 39
      else if (_.contains(knownBrowsers, option)) {                            // 40
        enabledBrowsers[option] = value;                                       // 41
      }                                                                        // 42
      else if (option === 'onlineOnly') {                                      // 43
        _.each(value, function (urlPrefix) {                                   // 44
          RoutePolicy.declare(urlPrefix, 'static-online');                     // 45
        });                                                                    // 46
      }                                                                        // 47
      else {                                                                   // 48
        throw new Error('Invalid AppCache config option: ' + option);          // 49
      }                                                                        // 50
    });                                                                        // 51
  }                                                                            // 52
};                                                                             // 53
                                                                               // 54
var browserEnabled = function(request) {                                       // 55
  return enabledBrowsers[request.browser.name];                                // 56
};                                                                             // 57
                                                                               // 58
WebApp.addHtmlAttributeHook(function (request) {                               // 59
  if (browserEnabled(request))                                                 // 60
    return 'manifest="/app.manifest"';                                         // 61
  else                                                                         // 62
    return null;                                                               // 63
});                                                                            // 64
                                                                               // 65
WebApp.connectHandlers.use(function(req, res, next) {                          // 66
  if (req.url !== '/app.manifest') {                                           // 67
    return next();                                                             // 68
  }                                                                            // 69
                                                                               // 70
  // Browsers will get confused if we unconditionally serve the                // 71
  // manifest and then disable the app cache for that browser.  If             // 72
  // the app cache had previously been enabled for a browser, it               // 73
  // will continue to fetch the manifest as long as it's available,            // 74
  // even if we now are not including the manifest attribute in the            // 75
  // app HTML.  (Firefox for example will continue to display "this            // 76
  // website is asking to store data on your computer for offline              // 77
  // use").  Returning a 404 gets the browser to really turn off the           // 78
  // app cache.                                                                // 79
                                                                               // 80
  if (!browserEnabled(WebApp.categorizeRequest(req))) {                        // 81
    res.writeHead(404);                                                        // 82
    res.end();                                                                 // 83
    return;                                                                    // 84
  }                                                                            // 85
                                                                               // 86
  // After the browser has downloaded the app files from the server and        // 87
  // has populated the browser's application cache, the browser will           // 88
  // *only* connect to the server and reload the application if the            // 89
  // *contents* of the app manifest file has changed.                          // 90
  //                                                                           // 91
  // So we have to ensure that if any static client resources change,          // 92
  // something changes in the manifest file.  We compute a hash of             // 93
  // everything that gets delivered to the client during the initial           // 94
  // web page load, and include that hash as a comment in the app              // 95
  // manifest.  That way if anything changes, the comment changes, and         // 96
  // the browser will reload resources.                                        // 97
                                                                               // 98
  var hash = crypto.createHash('sha1');                                        // 99
  hash.update(JSON.stringify(__meteor_runtime_config__), 'utf8');              // 100
  _.each(WebApp.clientProgram.manifest, function (resource) {                  // 101
    if (resource.where === 'client' || resource.where === 'internal') {        // 102
      hash.update(resource.hash);                                              // 103
    }                                                                          // 104
  });                                                                          // 105
  var digest = hash.digest('hex');                                             // 106
                                                                               // 107
  var manifest = "CACHE MANIFEST\n\n";                                         // 108
  manifest += '# ' + digest + "\n\n";                                          // 109
                                                                               // 110
  manifest += "CACHE:" + "\n";                                                 // 111
  manifest += "/" + "\n";                                                      // 112
  _.each(WebApp.clientProgram.manifest, function (resource) {                  // 113
    if (resource.where === 'client' &&                                         // 114
        ! RoutePolicy.classify(resource.url)) {                                // 115
      manifest += resource.url;                                                // 116
      // If the resource is not already cacheable (has a query                 // 117
      // parameter, presumably with a hash or version of some sort),           // 118
      // put a version with a hash in the cache.                               // 119
      //                                                                       // 120
      // Avoid putting a non-cacheable asset into the cache, otherwise         // 121
      // the user can't modify the asset until the cache headers               // 122
      // expire.                                                               // 123
      if (!resource.cacheable)                                                 // 124
        manifest += "?" + resource.hash;                                       // 125
                                                                               // 126
      manifest += "\n";                                                        // 127
    }                                                                          // 128
  });                                                                          // 129
  manifest += "\n";                                                            // 130
                                                                               // 131
  manifest += "FALLBACK:\n";                                                   // 132
  manifest += "/ /" + "\n";                                                    // 133
  // Add a fallback entry for each uncacheable asset we added above.           // 134
  //                                                                           // 135
  // This means requests for the bare url (/image.png instead of               // 136
  // /image.png?hash) will work offline. Online, however, the browser          // 137
  // will send a request to the server. Users can remove this extra            // 138
  // request to the server and have the asset served from cache by             // 139
  // specifying the full URL with hash in their code (manually, with           // 140
  // some sort of URL rewriting helper)                                        // 141
  _.each(WebApp.clientProgram.manifest, function (resource) {                  // 142
    if (resource.where === 'client' &&                                         // 143
        ! RoutePolicy.classify(resource.url) &&                                // 144
        !resource.cacheable) {                                                 // 145
      manifest += resource.url + " " + resource.url +                          // 146
        "?" + resource.hash + "\n";                                            // 147
    }                                                                          // 148
  });                                                                          // 149
                                                                               // 150
  manifest += "\n";                                                            // 151
                                                                               // 152
  manifest += "NETWORK:\n";                                                    // 153
  // TODO adding the manifest file to NETWORK should be unnecessary?           // 154
  // Want more testing to be sure.                                             // 155
  manifest += "/app.manifest" + "\n";                                          // 156
  _.each(                                                                      // 157
    [].concat(                                                                 // 158
      RoutePolicy.urlPrefixesFor('network'),                                   // 159
      RoutePolicy.urlPrefixesFor('static-online')                              // 160
    ),                                                                         // 161
    function (urlPrefix) {                                                     // 162
      manifest += urlPrefix + "\n";                                            // 163
    }                                                                          // 164
  );                                                                           // 165
  manifest += "*" + "\n";                                                      // 166
                                                                               // 167
  // content length needs to be based on bytes                                 // 168
  var body = new Buffer(manifest);                                             // 169
                                                                               // 170
  res.setHeader('Content-Type', 'text/cache-manifest');                        // 171
  res.setHeader('Content-Length', body.length);                                // 172
  return res.end(body);                                                        // 173
});                                                                            // 174
                                                                               // 175
var sizeCheck = function() {                                                   // 176
  var totalSize = 0;                                                           // 177
  _.each(WebApp.clientProgram.manifest, function (resource) {                  // 178
    if (resource.where === 'client') {                                         // 179
      totalSize += resource.size;                                              // 180
    }                                                                          // 181
  });                                                                          // 182
  if (totalSize > 5 * 1024 * 1024) {                                           // 183
    Meteor._debug(                                                             // 184
      "** You are using the appcache package but the total size of the\n" +    // 185
      "** cached resources is " +                                              // 186
      (totalSize / 1024 / 1024).toFixed(1) + "MB.\n" +                         // 187
      "**\n" +                                                                 // 188
      "** This is over the recommended maximum of 5 MB and may break your\n" + // 189
      "** app in some browsers! See http://docs.meteor.com/#appcache\n" +      // 190
      "** for more information and fixes.\n"                                   // 191
    );                                                                         // 192
  }                                                                            // 193
};                                                                             // 194
                                                                               // 195
sizeCheck();                                                                   // 196
                                                                               // 197
/////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.appcache = {};

})();

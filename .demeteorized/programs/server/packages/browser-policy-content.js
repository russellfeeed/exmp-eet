(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;
var BrowserPolicy = Package['browser-policy-common'].BrowserPolicy;

(function () {

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/browser-policy-content/browser-policy-content.js                     //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
// By adding this package, you get the following default policy:                 // 1
// No eval or other string-to-code, and content can only be loaded from the      // 2
// same origin as the app (except for XHRs and websocket connections, which can  // 3
// go to any origin).                                                            // 4
//                                                                               // 5
// Apps should call BrowserPolicy.content.disallowInlineScripts() if they are    // 6
// not using any inline script tags and are willing to accept an extra round     // 7
// trip on page load.                                                            // 8
//                                                                               // 9
// BrowserPolicy.content functions for tweaking CSP:                             // 10
// allowInlineScripts()                                                          // 11
// disallowInlineScripts(): adds extra round-trip to page load time              // 12
// allowInlineStyles()                                                           // 13
// disallowInlineStyles()                                                        // 14
// allowEval()                                                                   // 15
// disallowEval()                                                                // 16
//                                                                               // 17
// For each type of content (script, object, image, media, font, connect,        // 18
// style), there are the following functions:                                    // 19
// allow<content type>Origin(origin): allows the type of content to be loaded    // 20
// from the given origin                                                         // 21
// allow<content type>DataUrl(): allows the content to be loaded from data: URLs // 22
// allow<content type>SameOrigin(): allows the content to be loaded from the     // 23
// same origin                                                                   // 24
// disallow<content type>(): disallows this type of content all together (can't  // 25
// be called for script)                                                         // 26
//                                                                               // 27
// The following functions allow you to set rules for all types of content at    // 28
// once:                                                                         // 29
// allowAllContentOrigin(origin)                                                 // 30
// allowAllContentDataUrl()                                                      // 31
// allowAllContentSameOrigin()                                                   // 32
// disallowAllContent()                                                          // 33
//                                                                               // 34
                                                                                 // 35
var cspSrcs;                                                                     // 36
var cachedCsp; // Avoid constructing the header out of cspSrcs when possible.    // 37
                                                                                 // 38
// CSP keywords have to be single-quoted.                                        // 39
var unsafeInline = "'unsafe-inline'";                                            // 40
var unsafeEval = "'unsafe-eval'";                                                // 41
var selfKeyword = "'self'";                                                      // 42
var noneKeyword = "'none'";                                                      // 43
                                                                                 // 44
BrowserPolicy.content = {};                                                      // 45
                                                                                 // 46
var parseCsp = function (csp) {                                                  // 47
  var policies = csp.split("; ");                                                // 48
  cspSrcs = {};                                                                  // 49
  _.each(policies, function (policy) {                                           // 50
    if (policy[policy.length - 1] === ";")                                       // 51
      policy = policy.substring(0, policy.length - 1);                           // 52
    var srcs = policy.split(" ");                                                // 53
    var directive = srcs[0];                                                     // 54
    if (_.indexOf(srcs, noneKeyword) !== -1)                                     // 55
      cspSrcs[directive] = null;                                                 // 56
    else                                                                         // 57
      cspSrcs[directive] = srcs.slice(1);                                        // 58
  });                                                                            // 59
                                                                                 // 60
  if (cspSrcs["default-src"] === undefined)                                      // 61
    throw new Error("Content Security Policies used with " +                     // 62
                    "browser-policy must specify a default-src.");               // 63
                                                                                 // 64
  // Copy default-src sources to other directives.                               // 65
  _.each(cspSrcs, function (sources, directive) {                                // 66
    cspSrcs[directive] = _.union(sources || [], cspSrcs["default-src"] || []);   // 67
  });                                                                            // 68
};                                                                               // 69
                                                                                 // 70
var removeCspSrc = function (directive, src) {                                   // 71
  cspSrcs[directive] = _.without(cspSrcs[directive] || [], src);                 // 72
};                                                                               // 73
                                                                                 // 74
// Prepare for a change to cspSrcs. Ensure that we have a key in the dictionary  // 75
// and clear any cached CSP.                                                     // 76
var prepareForCspDirective = function (directive) {                              // 77
  cspSrcs = cspSrcs || {};                                                       // 78
  cachedCsp = null;                                                              // 79
  if (! _.has(cspSrcs, directive))                                               // 80
    cspSrcs[directive] = _.clone(cspSrcs["default-src"]);                        // 81
};                                                                               // 82
                                                                                 // 83
var setDefaultPolicy = function () {                                             // 84
  // By default, unsafe inline scripts and styles are allowed, since we expect   // 85
  // many apps will use them for analytics, etc. Unsafe eval is disallowed, and  // 86
  // the only allowable content source is the same origin or data, except for    // 87
  // connect which allows anything (since meteor.com apps make websocket         // 88
  // connections to a lot of different origins).                                 // 89
  BrowserPolicy.content.setPolicy("default-src 'self'; " +                       // 90
                                  "script-src 'self' 'unsafe-inline'; " +        // 91
                                  "connect-src *; " +                            // 92
                                  "img-src data: 'self'; " +                     // 93
                                  "style-src 'self' 'unsafe-inline';");          // 94
};                                                                               // 95
                                                                                 // 96
_.extend(BrowserPolicy.content, {                                                // 97
  // Exported for tests and browser-policy-common.                               // 98
  _constructCsp: function () {                                                   // 99
    if (! cspSrcs || _.isEmpty(cspSrcs))                                         // 100
      return null;                                                               // 101
                                                                                 // 102
    if (cachedCsp)                                                               // 103
      return cachedCsp;                                                          // 104
                                                                                 // 105
    var header = _.map(cspSrcs, function (srcs, directive) {                     // 106
      srcs = srcs || [];                                                         // 107
      if (_.isEmpty(srcs))                                                       // 108
        srcs = [noneKeyword];                                                    // 109
      var directiveCsp = _.uniq(srcs).join(" ");                                 // 110
      return directive + " " + directiveCsp + ";";                               // 111
    });                                                                          // 112
                                                                                 // 113
    header = header.join(" ");                                                   // 114
    cachedCsp = header;                                                          // 115
    return header;                                                               // 116
  },                                                                             // 117
  _reset: function () {                                                          // 118
    cachedCsp = null;                                                            // 119
    setDefaultPolicy();                                                          // 120
  },                                                                             // 121
                                                                                 // 122
  setPolicy: function (csp) {                                                    // 123
    cachedCsp = null;                                                            // 124
    parseCsp(csp);                                                               // 125
  },                                                                             // 126
                                                                                 // 127
  _keywordAllowed: function (directive, keyword) {                               // 128
    return (cspSrcs[directive] &&                                                // 129
            _.indexOf(cspSrcs[directive], keyword) !== -1);                      // 130
  },                                                                             // 131
                                                                                 // 132
  // Used by webapp to determine whether we need an extra round trip for         // 133
  // __meteor_runtime_config__.  If we're in a test run, we should always return // 134
  // true, since CSP headers are never sent on tests -- unless the               // 135
  // _calledFromTests flag is set, in which case a test is testing what          // 136
  // inlineScriptsAllowed() would return if we weren't in a test. Wphew.         // 137
  // XXX maybe this test interface could be cleaned up                           // 138
  inlineScriptsAllowed: function (_calledFromTests) {                            // 139
    if (BrowserPolicy._runningTest() && ! _calledFromTests)                      // 140
      return true;                                                               // 141
                                                                                 // 142
    return BrowserPolicy.content._keywordAllowed("script-src",                   // 143
                                                 unsafeInline);                  // 144
  },                                                                             // 145
                                                                                 // 146
  // Helpers for creating content security policies                              // 147
                                                                                 // 148
  allowInlineScripts: function () {                                              // 149
    prepareForCspDirective("script-src");                                        // 150
    cspSrcs["script-src"].push(unsafeInline);                                    // 151
  },                                                                             // 152
  disallowInlineScripts: function () {                                           // 153
    prepareForCspDirective("script-src");                                        // 154
    removeCspSrc("script-src", unsafeInline);                                    // 155
  },                                                                             // 156
  allowEval: function () {                                                       // 157
    prepareForCspDirective("script-src");                                        // 158
    cspSrcs["script-src"].push(unsafeEval);                                      // 159
  },                                                                             // 160
  disallowEval: function () {                                                    // 161
    prepareForCspDirective("script-src");                                        // 162
    removeCspSrc("script-src", unsafeEval);                                      // 163
  },                                                                             // 164
  allowInlineStyles: function () {                                               // 165
    prepareForCspDirective("style-src");                                         // 166
    cspSrcs["style-src"].push(unsafeInline);                                     // 167
  },                                                                             // 168
  disallowInlineStyles: function () {                                            // 169
    prepareForCspDirective("style-src");                                         // 170
    removeCspSrc("style-src", unsafeInline);                                     // 171
  },                                                                             // 172
                                                                                 // 173
  // Functions for setting defaults                                              // 174
  allowSameOriginForAll: function () {                                           // 175
    BrowserPolicy.content.allowOriginForAll(selfKeyword);                        // 176
  },                                                                             // 177
  allowDataUrlForAll: function () {                                              // 178
    BrowserPolicy.content.allowOriginForAll("data:");                            // 179
  },                                                                             // 180
  allowOriginForAll: function (origin) {                                         // 181
    prepareForCspDirective("default-src");                                       // 182
    _.each(_.keys(cspSrcs), function (directive) {                               // 183
      cspSrcs[directive].push(origin);                                           // 184
    });                                                                          // 185
  },                                                                             // 186
  disallowAll: function () {                                                     // 187
    cachedCsp = null;                                                            // 188
    cspSrcs = {                                                                  // 189
      "default-src": []                                                          // 190
    };                                                                           // 191
  }                                                                              // 192
});                                                                              // 193
                                                                                 // 194
// allow<Resource>Origin, allow<Resource>Data, allow<Resource>self, and          // 195
// disallow<Resource> methods for each type of resource.                         // 196
_.each(["script", "object", "img", "media",                                      // 197
        "font", "connect", "style"],                                             // 198
       function (resource) {                                                     // 199
         var directive = resource + "-src";                                      // 200
         var methodResource;                                                     // 201
         if (resource !== "img") {                                               // 202
           methodResource = resource.charAt(0).toUpperCase() +                   // 203
             resource.slice(1);                                                  // 204
         } else {                                                                // 205
           methodResource = "Image";                                             // 206
         }                                                                       // 207
         var allowMethodName = "allow" + methodResource + "Origin";              // 208
         var disallowMethodName = "disallow" + methodResource;                   // 209
         var allowDataMethodName = "allow" + methodResource + "DataUrl";         // 210
         var allowSelfMethodName = "allow" + methodResource + "SameOrigin";      // 211
                                                                                 // 212
         BrowserPolicy.content[allowMethodName] = function (src) {               // 213
           prepareForCspDirective(directive);                                    // 214
           cspSrcs[directive].push(src);                                         // 215
         };                                                                      // 216
         BrowserPolicy.content[disallowMethodName] = function () {               // 217
           cachedCsp = null;                                                     // 218
           cspSrcs[directive] = [];                                              // 219
         };                                                                      // 220
         BrowserPolicy.content[allowDataMethodName] = function () {              // 221
           prepareForCspDirective(directive);                                    // 222
           cspSrcs[directive].push("data:");                                     // 223
         };                                                                      // 224
         BrowserPolicy.content[allowSelfMethodName] = function () {              // 225
           prepareForCspDirective(directive);                                    // 226
           cspSrcs[directive].push(selfKeyword);                                 // 227
         };                                                                      // 228
       });                                                                       // 229
                                                                                 // 230
                                                                                 // 231
setDefaultPolicy();                                                              // 232
                                                                                 // 233
///////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['browser-policy-content'] = {};

})();

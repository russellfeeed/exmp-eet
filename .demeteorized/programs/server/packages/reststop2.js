(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var check = Package.check.check;
var Match = Package.check.Match;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var SRP = Package.srp.SRP;
var _ = Package.underscore._;

/* Package-scope variables */
var RESTstop, _RESTstop, context, Fiber, MethodInvocation;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/reststop2/server.js                                                                          //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
_RESTstop = function() {                                                                                 // 1
  this._routes = [];                                                                                     // 2
  this._config = {                                                                                       // 3
    use_auth: false,                                                                                     // 4
    api_path: '/api',                                                                                    // 5
    onLoggedIn: function(){},                                                                            // 6
    onLoggedOut: function(){}                                                                            // 7
  };                                                                                                     // 8
  this._started = false;                                                                                 // 9
};                                                                                                       // 10
                                                                                                         // 11
// simply match this path to this function                                                               // 12
_RESTstop.prototype.add = function(path, options, endpoint)  {                                           // 13
  var self = this;                                                                                       // 14
                                                                                                         // 15
  if(path[0] != "/") path = "/" + path;                                                                  // 16
                                                                                                         // 17
  // Start serving on first add() call                                                                   // 18
  if(!this._started){                                                                                    // 19
    this._start();                                                                                       // 20
  }                                                                                                      // 21
                                                                                                         // 22
  if (_.isObject(path) && ! _.isRegExp(path)) {                                                          // 23
    _.each(path, function(endpoint, p) {                                                                 // 24
      self.add(p, endpoint);                                                                             // 25
    });                                                                                                  // 26
  } else {                                                                                               // 27
    if (! endpoint) {                                                                                    // 28
      // no options were supplied so 2nd parameter is the endpoint                                       // 29
      endpoint = options;                                                                                // 30
      options = null;                                                                                    // 31
    }                                                                                                    // 32
    if (! _.isFunction(endpoint)) {                                                                      // 33
      endpoint = _.bind(_.identity, null, endpoint);                                                     // 34
    }                                                                                                    // 35
    self._routes.push([new RESTstop.Route(self._config.api_path + path, options), endpoint]);            // 36
  }                                                                                                      // 37
};                                                                                                       // 38
                                                                                                         // 39
_RESTstop.prototype.match = function(request, response) {                                                // 40
  for (var i = 0; i < this._routes.length; i++) {                                                        // 41
    var params = {}, route = this._routes[i];                                                            // 42
                                                                                                         // 43
    if (route[0].match(request.url, request.method, params)) {                                           // 44
      context = {request: request, response: response, params: params};                                  // 45
                                                                                                         // 46
      var args = [];                                                                                     // 47
      for (var key in context.params)                                                                    // 48
        args.push(context.params[key]);                                                                  // 49
                                                                                                         // 50
      if(request.method == "POST" || request.method == "PUT") {                                          // 51
        _.extend(context.params, request.body);                                                          // 52
      }                                                                                                  // 53
      if(request.method == "GET" || _.size(request.query)) {                                             // 54
        _.extend(context.params, request.query);                                                         // 55
      }                                                                                                  // 56
                                                                                                         // 57
      if(this._config.use_auth) {                                                                        // 58
        context.user = false;                                                                            // 59
                                                                                                         // 60
        var userId = context.params.userId;                                                              // 61
        var loginToken = context.params.loginToken;                                                      // 62
                                                                                                         // 63
        if(request.headers['x-login-token']) {                                                           // 64
          loginToken = request.headers['x-login-token'];                                                 // 65
        }                                                                                                // 66
        if(request.headers['x-user-id']) {                                                               // 67
          userId = request.headers['x-user-id'];                                                         // 68
        }                                                                                                // 69
                                                                                                         // 70
        // Get the user object                                                                           // 71
        if(userId && loginToken) {                                                                       // 72
          context.user = Meteor.users.findOne({                                                          // 73
            _id: userId,                                                                                 // 74
            "services.resume.loginTokens.token": loginToken                                              // 75
          });                                                                                            // 76
        }                                                                                                // 77
                                                                                                         // 78
        // Return an error if no user and login required                                                 // 79
        if(route[0].options.require_login && !context.user) {                                            // 80
          return [403, {success: false, message: "You must be logged in to do this."}];                  // 81
        }                                                                                                // 82
      }                                                                                                  // 83
                                                                                                         // 84
      try {                                                                                              // 85
        return route[1].apply(context, args);                                                            // 86
      } catch (e) {                                                                                      // 87
        return [e.error || 404, {success: false, message: e.reason || e.message}];                       // 88
      }                                                                                                  // 89
    }                                                                                                    // 90
  }                                                                                                      // 91
  return false;                                                                                          // 92
};                                                                                                       // 93
                                                                                                         // 94
_RESTstop.prototype.configure = function(config){                                                        // 95
  if(this._started){                                                                                     // 96
    throw new Error("RESTstop.configure() has to be called before first call to RESTstop.add()");        // 97
  }                                                                                                      // 98
                                                                                                         // 99
  _.extend(this._config, config);                                                                        // 100
                                                                                                         // 101
  if(this._config.api_path[0] != "/") {                                                                  // 102
    this._config.api_path = "/"  +this._config.api_path;                                                 // 103
  }                                                                                                      // 104
};                                                                                                       // 105
                                                                                                         // 106
_RESTstop.prototype._start = function(){                                                                 // 107
  var self = this;                                                                                       // 108
                                                                                                         // 109
  if(this._started){                                                                                     // 110
    throw new Error("RESTstop has already been started");                                                // 111
  }                                                                                                      // 112
                                                                                                         // 113
  this._started = true;                                                                                  // 114
                                                                                                         // 115
  // hook up the serving                                                                                 // 116
  RoutePolicy.declare('/' + this._config.api_path + '/', 'network');                                     // 117
                                                                                                         // 118
  var self = this,                                                                                       // 119
      connect = Npm.require("connect");                                                                  // 120
                                                                                                         // 121
  WebApp.connectHandlers.use(connect.query());                                                           // 122
  WebApp.connectHandlers.use(connect.bodyParser());                                                      // 123
  WebApp.connectHandlers.use(function(req, res, next) {                                                  // 124
    if (req.url.slice(0, self._config.api_path.length) !== self._config.api_path) {                      // 125
      return next();                                                                                     // 126
    }                                                                                                    // 127
                                                                                                         // 128
    // need to wrap in a fiber in case they do something async                                           // 129
    // (e.g. in the database)                                                                            // 130
    if(typeof(Fiber)=="undefined") Fiber = Npm.require('fibers');                                        // 131
                                                                                                         // 132
    Fiber(function() {                                                                                   // 133
      res.statusCode = 200; // 200 response, by default                                                  // 134
      var output = RESTstop.match(req, res);                                                             // 135
                                                                                                         // 136
      if (output === false) {                                                                            // 137
        output = [404, {success: false, message:'API method not found'}];                                // 138
      }                                                                                                  // 139
                                                                                                         // 140
      // parse out the various type of response we can have                                              // 141
                                                                                                         // 142
      // array can be                                                                                    // 143
      // [content], [status, content], [status, headers, content]                                        // 144
      if (_.isArray(output)) {                                                                           // 145
        // copy the array so we aren't actually modifying it!                                            // 146
        output = output.slice(0);                                                                        // 147
                                                                                                         // 148
        if (output.length === 3) {                                                                       // 149
          var headers = output.splice(1, 1)[0];                                                          // 150
          _.each(headers, function(value, key) {                                                         // 151
            res.setHeader(key, value);                                                                   // 152
          });                                                                                            // 153
        }                                                                                                // 154
                                                                                                         // 155
        if (output.length === 2) {                                                                       // 156
          res.statusCode = output.shift();                                                               // 157
        }                                                                                                // 158
                                                                                                         // 159
        output = output[0];                                                                              // 160
      }                                                                                                  // 161
                                                                                                         // 162
      if (_.isNumber(output)) {                                                                          // 163
        res.statusCode = output;                                                                         // 164
        output = '';                                                                                     // 165
      }                                                                                                  // 166
                                                                                                         // 167
      if(_.isObject(output)) {                                                                           // 168
        output = JSON.stringify(output);                                                                 // 169
        res.setHeader("Content-Type", "text/json");                                                      // 170
      }                                                                                                  // 171
                                                                                                         // 172
      return res.end(output);                                                                            // 173
    }).run();                                                                                            // 174
  });                                                                                                    // 175
                                                                                                         // 176
  if(this._config.use_auth) {                                                                            // 177
    RESTstop.initAuth();                                                                                 // 178
  }                                                                                                      // 179
};                                                                                                       // 180
                                                                                                         // 181
_RESTstop.prototype.call = function (context, name, args) {                                              // 182
  var args = Array.prototype.slice.call(arguments, 2);                                                   // 183
  return this._apply(context, name, args, 'method_handlers');                                            // 184
};                                                                                                       // 185
                                                                                                         // 186
_RESTstop.prototype.apply = function (context, name, args) {                                             // 187
  return this._apply(context, name, args, 'method_handlers');                                            // 188
};                                                                                                       // 189
                                                                                                         // 190
_RESTstop.prototype.getPublished = function (context, name, args) {                                      // 191
  return this._apply(context, name, args, 'publish_handlers');                                           // 192
};                                                                                                       // 193
                                                                                                         // 194
MethodInvocation = function (options) {                                                                  // 195
  var self = this;                                                                                       // 196
                                                                                                         // 197
  // true if we're running not the actual method, but a stub (that is,                                   // 198
  // if we're on a client (which may be a browser, or in the future a                                    // 199
  // server connecting to another server) and presently running a                                        // 200
  // simulation of a server-side method for latency compensation                                         // 201
  // purposes). not currently true except in a client such as a browser,                                 // 202
  // since there's usually no point in running stubs unless you have a                                   // 203
  // zero-latency connection to the user.                                                                // 204
  this.isSimulation = options.isSimulation;                                                              // 205
                                                                                                         // 206
  // call this function to allow other method invocations (from the                                      // 207
  // same client) to continue running without waiting for this one to                                    // 208
  // complete.                                                                                           // 209
  this._unblock = options.unblock || function () {};                                                     // 210
  this._calledUnblock = false;                                                                           // 211
                                                                                                         // 212
  // current user id                                                                                     // 213
  this.userId = options.userId;                                                                          // 214
                                                                                                         // 215
  // sets current user id in all appropriate server contexts and                                         // 216
  // reruns subscriptions                                                                                // 217
  this._setUserId = options.setUserId || function () {};                                                 // 218
                                                                                                         // 219
  // used for associating the connection with a login token so that the                                  // 220
  // connection can be closed if the token is no longer valid                                            // 221
  this._setLoginToken = options._setLoginToken || function () {};                                        // 222
                                                                                                         // 223
  // Scratch data scoped to this connection (livedata_connection on the                                  // 224
  // client, livedata_session on the server). This is only used                                          // 225
  // internally, but we should have real and documented API for this                                     // 226
  // sort of thing someday.                                                                              // 227
  this._sessionData = options.sessionData;                                                               // 228
};                                                                                                       // 229
                                                                                                         // 230
_.extend(MethodInvocation.prototype, {                                                                   // 231
  unblock: function () {                                                                                 // 232
    var self = this;                                                                                     // 233
    self._calledUnblock = true;                                                                          // 234
    self._unblock();                                                                                     // 235
  },                                                                                                     // 236
  setUserId: function(userId) {                                                                          // 237
    var self = this;                                                                                     // 238
    if (self._calledUnblock)                                                                             // 239
      throw new Error("Can't call setUserId in a method after calling unblock");                         // 240
    self.userId = userId;                                                                                // 241
    self._setUserId(userId);                                                                             // 242
  },                                                                                                     // 243
  _setLoginToken: function (token) {                                                                     // 244
    this._setLoginToken(token);                                                                          // 245
    this._sessionData.loginToken = token;                                                                // 246
  },                                                                                                     // 247
  _getLoginToken: function (token) {                                                                     // 248
    return this._sessionData.loginToken;                                                                 // 249
  }                                                                                                      // 250
});                                                                                                      // 251
                                                                                                         // 252
_RESTstop.prototype._apply = function (context, name, args, handler_name) {                              // 253
  var self = Meteor.default_server;                                                                      // 254
                                                                                                         // 255
  // Run the handler                                                                                     // 256
  var handler = self[handler_name][name];                                                                // 257
  var exception;                                                                                         // 258
  if (!handler) {                                                                                        // 259
    exception = new Meteor.Error(404, "Method not found");                                               // 260
  } else {                                                                                               // 261
                                                                                                         // 262
    var userId = context.user ? context.user._id : null;                                                 // 263
    var setUserId = function() {                                                                         // 264
      throw new Error("Can't call setUserId on a server initiated method call");                         // 265
    };                                                                                                   // 266
                                                                                                         // 267
    var invocation = new MethodInvocation({                                                              // 268
      isSimulation: false,                                                                               // 269
      userId: context.user._id, setUserId: setUserId,                                                    // 270
      sessionData: self.sessionData                                                                      // 271
    });                                                                                                  // 272
                                                                                                         // 273
    try {                                                                                                // 274
      var result = DDP._CurrentInvocation.withValue(invocation, function () {                            // 275
        return maybeAuditArgumentChecks(                                                                 // 276
          handler, invocation, args, "internal call to '" + name + "'");                                 // 277
      });                                                                                                // 278
    } catch (e) {                                                                                        // 279
      exception = e;                                                                                     // 280
    }                                                                                                    // 281
  }                                                                                                      // 282
                                                                                                         // 283
  if (exception)                                                                                         // 284
    throw exception;                                                                                     // 285
  return result;                                                                                         // 286
};                                                                                                       // 287
                                                                                                         // 288
var maybeAuditArgumentChecks = function (f, context, args, description) {                                // 289
  args = args || [];                                                                                     // 290
  if (Package['audit-argument-checks']) {                                                                // 291
    return Match._failIfArgumentsAreNotAllChecked(                                                       // 292
      f, context, args, description);                                                                    // 293
  }                                                                                                      // 294
  return f.apply(context, args);                                                                         // 295
};                                                                                                       // 296
                                                                                                         // 297
// Make the router available                                                                             // 298
RESTstop = new _RESTstop();                                                                              // 299
                                                                                                         // 300
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/reststop2/routing.js                                                                         //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
// Route object taken from page.js, slightly stripped down                                               // 1
//                                                                                                       // 2
// Copyright (c) 2012 TJ Holowaychuk &lt;tj@vision-media.ca&gt;                                          // 3
//                                                                                                       // 4
/**                                                                                                      // 5
 * Initialize `Route` with the given HTTP `path`, and an array of `options`.                             // 6
 *                                                                                                       // 7
 * Options:                                                                                              // 8
 *                                                                                                       // 9
 *   - `methods`      the allowed methods. string ("POST") or array (["POST", "GET"]).                   // 10
 *   - `sensitive`    enable case-sensitive routes                                                       // 11
 *   - `strict`       enable strict matching for trailing slashes                                        // 12
 *                                                                                                       // 13
 * @param {String} path                                                                                  // 14
 * @param {Object} options.                                                                              // 15
 * @api private                                                                                          // 16
 */                                                                                                      // 17
                                                                                                         // 18
RESTstop.Route = function(path, options) {                                                               // 19
  this.options = options || {};                                                                          // 20
  this.path = path;                                                                                      // 21
  this.method = this.options.method;                                                                     // 22
                                                                                                         // 23
  if(this.method && !_.isArray(this.method)) {                                                           // 24
      this.method = [this.method];                                                                       // 25
  }                                                                                                      // 26
  if(this.method) {                                                                                      // 27
      this.method = _.map(this.method, function(s){ return s.toUpperCase(); });                          // 28
  }                                                                                                      // 29
                                                                                                         // 30
  this.regexp = pathtoRegexp(path                                                                        // 31
    , this.keys = []                                                                                     // 32
    , this.options.sensitive                                                                             // 33
    , this.options.strict);                                                                              // 34
}                                                                                                        // 35
                                                                                                         // 36
/**                                                                                                      // 37
 * Check if this route matches `path` and optional `method`, if so                                       // 38
 * populate `params`.                                                                                    // 39
 *                                                                                                       // 40
 * @param {String} path                                                                                  // 41
 * @param {String} method                                                                                // 42
 * @param {Array} params                                                                                 // 43
 * @return {Boolean}                                                                                     // 44
 * @api private                                                                                          // 45
 */                                                                                                      // 46
                                                                                                         // 47
RESTstop.Route.prototype.match = function(path, method, params){                                         // 48
  var keys, qsIndex, pathname, m;                                                                        // 49
                                                                                                         // 50
  if(this.method && !_.contains(this.method, method)) return false;                                      // 51
                                                                                                         // 52
  keys = this.keys;                                                                                      // 53
  qsIndex = path.indexOf('?');                                                                           // 54
  pathname = ~qsIndex ? path.slice(0, qsIndex) : path;                                                   // 55
  m = this.regexp.exec(pathname);                                                                        // 56
                                                                                                         // 57
  if (!m) return false;                                                                                  // 58
                                                                                                         // 59
  for (var i = 1, len = m.length; i < len; ++i) {                                                        // 60
    var key = keys[i - 1];                                                                               // 61
                                                                                                         // 62
    var val = 'string' == typeof m[i]                                                                    // 63
      ? decodeURIComponent(m[i])                                                                         // 64
      : m[i];                                                                                            // 65
                                                                                                         // 66
    if (key) {                                                                                           // 67
      params[key.name] = undefined !== params[key.name]                                                  // 68
        ? params[key.name]                                                                               // 69
        : val;                                                                                           // 70
    } else {                                                                                             // 71
      params.push(val);                                                                                  // 72
    }                                                                                                    // 73
  }                                                                                                      // 74
                                                                                                         // 75
  return true;                                                                                           // 76
};                                                                                                       // 77
                                                                                                         // 78
/**                                                                                                      // 79
 * Normalize the given path string,                                                                      // 80
 * returning a regular expression.                                                                       // 81
 *                                                                                                       // 82
 * An empty array should be passed,                                                                      // 83
 * which will contain the placeholder                                                                    // 84
 * key names. For example "/user/:id" will                                                               // 85
 * then contain ["id"].                                                                                  // 86
 *                                                                                                       // 87
 * @param  {String|RegExp|Array} path                                                                    // 88
 * @param  {Array} keys                                                                                  // 89
 * @param  {Boolean} sensitive                                                                           // 90
 * @param  {Boolean} strict                                                                              // 91
 * @return {RegExp}                                                                                      // 92
 * @api private                                                                                          // 93
 */                                                                                                      // 94
                                                                                                         // 95
function pathtoRegexp(path, keys, sensitive, strict) {                                                   // 96
  if (path instanceof RegExp) return path;                                                               // 97
  if (path instanceof Array) path = '(' + path.join('|') + ')';                                          // 98
  path = path                                                                                            // 99
    .concat(strict ? '' : '/?')                                                                          // 100
    .replace(/\/\(/g, '(?:/')                                                                            // 101
    .replace(/\+/g, '__plus__')                                                                          // 102
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){ // 103
      keys.push({ name: key, optional: !! optional });                                                   // 104
      slash = slash || '';                                                                               // 105
      return ''                                                                                          // 106
        + (optional ? '' : slash)                                                                        // 107
        + '(?:'                                                                                          // 108
        + (optional ? slash : '')                                                                        // 109
        + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'                      // 110
        + (optional || '');                                                                              // 111
    })                                                                                                   // 112
    .replace(/([\/.])/g, '\\$1')                                                                         // 113
    .replace(/__plus__/g, '(.+)')                                                                        // 114
    .replace(/\*/g, '(.*)');                                                                             // 115
                                                                                                         // 116
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');                                             // 117
};                                                                                                       // 118
                                                                                                         // 119
/// END Route object                                                                                     // 120
                                                                                                         // 121
// Added by tom, lifted from mini-pages, with some modifications                                         // 122
                                                                                                         // 123
/**                                                                                                      // 124
  Given a context object, returns a url path with the values of the context                              // 125
  object mapped over the path.                                                                           // 126
                                                                                                         // 127
  Alternatively, supply the named parts of the paths as discrete arguments.                              // 128
                                                                                                         // 129
  @method pathWithContext                                                                                // 130
  @param [context] {Object} An optional context object to use for                                        // 131
  interpolation.                                                                                         // 132
                                                                                                         // 133
  @example                                                                                               // 134
      // given a page with a path of "/posts/:_id/edit"                                                  // 135
      var path = page.pathWithContext({ _id: 123 });                                                     // 136
      // > /posts/123/edit                                                                               // 137
*/                                                                                                       // 138
RESTstop.Route.prototype.pathWithContext = function (context) {                                          // 139
  var self = this,                                                                                       // 140
      path = self.path,                                                                                  // 141
      parts,                                                                                             // 142
      args = arguments;                                                                                  // 143
                                                                                                         // 144
  /* get an array of keys from the path to replace with context values.                                  // 145
  /* XXX Right now this comes from page-js. Remove dependency.                                           // 146
   */                                                                                                    // 147
  parts = self.regexp.exec(self.path).slice(1);                                                          // 148
                                                                                                         // 149
  context = context || {};                                                                               // 150
                                                                                                         // 151
  var replacePathPartWithContextValue = function (part, i) {                                             // 152
    var re = new RegExp(part, "g"),                                                                      // 153
        prop = part.replace(":", ""),                                                                    // 154
        val;                                                                                             // 155
                                                                                                         // 156
    if (_.isObject(context))                                                                             // 157
      val = context[prop]                                                                                // 158
    else                                                                                                 // 159
      val = args[i];                                                                                     // 160
                                                                                                         // 161
    path = path.replace(re, val || '');                                                                  // 162
  };                                                                                                     // 163
                                                                                                         // 164
  _.each(parts, replacePathPartWithContextValue);                                                        // 165
                                                                                                         // 166
  return path;                                                                                           // 167
}                                                                                                        // 168
                                                                                                         // 169
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/reststop2/auth.js                                                                            //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
var userQueryValidator = Match.Where(function (user) {                                                   // 1
  check(user, {                                                                                          // 2
    id: Match.Optional(String),                                                                          // 3
    username: Match.Optional(String),                                                                    // 4
    email: Match.Optional(String)                                                                        // 5
  });                                                                                                    // 6
  if (_.keys(user).length !== 1)                                                                         // 7
    throw new Match.Error("User property must have exactly one field");                                  // 8
  return true;                                                                                           // 9
});                                                                                                      // 10
                                                                                                         // 11
var selectorFromUserQuery = function (user) {                                                            // 12
  if (user.id)                                                                                           // 13
    return {_id: user.id};                                                                               // 14
  else if (user.username)                                                                                // 15
    return {username: user.username};                                                                    // 16
  else if (user.email)                                                                                   // 17
    return {"emails.address": user.email};                                                               // 18
  throw new Error("shouldn't happen (validation missed something)");                                     // 19
};                                                                                                       // 20
                                                                                                         // 21
var loginWithPassword = function (options) {                                                             // 22
  if (!options.password || !options.user)                                                                // 23
    return undefined; // don't handle                                                                    // 24
                                                                                                         // 25
  check(options, {user: userQueryValidator, password: String});                                          // 26
                                                                                                         // 27
  var selector = selectorFromUserQuery(options.user);                                                    // 28
  var user = Meteor.users.findOne(selector);                                                             // 29
  if (!user)                                                                                             // 30
    throw new Meteor.Error(403, "User not found");                                                       // 31
                                                                                                         // 32
  if (!user.services || !user.services.password ||                                                       // 33
  !user.services.password.srp)                                                                           // 34
  throw new Meteor.Error(403, "User has no password set");                                               // 35
                                                                                                         // 36
  // Just check the verifier output when the same identity and salt                                      // 37
  // are passed. Don't bother with a full exchange.                                                      // 38
  var verifier = user.services.password.srp;                                                             // 39
  var newVerifier = SRP.generateVerifier(options.password, {                                             // 40
    identity: verifier.identity, salt: verifier.salt});                                                  // 41
                                                                                                         // 42
    if (verifier.verifier !== newVerifier.verifier)                                                      // 43
      throw new Meteor.Error(403, "Incorrect password");                                                 // 44
                                                                                                         // 45
    var stampedLoginToken = Accounts._generateStampedLoginToken();                                       // 46
    Meteor.users.update(                                                                                 // 47
    user._id, {$push: {'services.resume.loginTokens': stampedLoginToken}});                              // 48
                                                                                                         // 49
    return {loginToken: stampedLoginToken.token, userId: user._id};                                      // 50
};                                                                                                       // 51
                                                                                                         // 52
_RESTstop.prototype.initAuth = function() {                                                              // 53
  RESTstop.add('login', {'method': 'POST'}, function() {                                                 // 54
    var user = {};                                                                                       // 55
    if(this.params.user.indexOf('@') == -1) {                                                            // 56
      user.username = this.params.user;                                                                  // 57
    } else {                                                                                             // 58
      user.email = this.params.user;                                                                     // 59
    }                                                                                                    // 60
                                                                                                         // 61
    try {                                                                                                // 62
      var login = loginWithPassword({                                                                    // 63
        'user': user,                                                                                    // 64
        'password': this.params.password                                                                 // 65
      });                                                                                                // 66
    } catch(e) {                                                                                         // 67
      return [e.error, {success: false, message: e.reason}];                                             // 68
    }                                                                                                    // 69
                                                                                                         // 70
    // Get the user object                                                                               // 71
    var context = [];                                                                                    // 72
    if(login.userId && login.loginToken) {                                                               // 73
      context.user = Meteor.users.findOne({                                                              // 74
        _id: login.userId,                                                                               // 75
        "services.resume.loginTokens.token": login.loginToken                                            // 76
      });                                                                                                // 77
    }                                                                                                    // 78
    RESTstop._config.onLoggedIn.apply(context);                                                          // 79
                                                                                                         // 80
    login.success = true;                                                                                // 81
    return login;                                                                                        // 82
  });                                                                                                    // 83
                                                                                                         // 84
  RESTstop.add('logout', {'method': 'GET', require_login: true}, function() {                            // 85
    var loginToken = this.params.loginToken;                                                             // 86
    if(this.request.headers['x-login-token']) {                                                          // 87
      loginToken = this.request.headers['x-login-token'];                                                // 88
    }                                                                                                    // 89
                                                                                                         // 90
    // Log the user out                                                                                  // 91
    Meteor.users.update(                                                                                 // 92
    this.user._id, {$pull: {'services.resume.loginTokens': {token: loginToken}}});                       // 93
                                                                                                         // 94
    RESTstop._config.onLoggedOut.call(this);                                                             // 95
                                                                                                         // 96
    return {success: true, message: "You've been logged out!"};                                          // 97
  });                                                                                                    // 98
};                                                                                                       // 99
                                                                                                         // 100
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.reststop2 = {
  RESTstop: RESTstop
};

})();

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
  };                                                                                                     // 6
  this._started = false;                                                                                 // 7
};                                                                                                       // 8
                                                                                                         // 9
// simply match this path to this function                                                               // 10
_RESTstop.prototype.add = function(path, options, endpoint)  {                                           // 11
  var self = this;                                                                                       // 12
                                                                                                         // 13
  if(path[0] != "/") path = "/" + path;                                                                  // 14
                                                                                                         // 15
  // Start serving on first add() call                                                                   // 16
  if(!this._started){                                                                                    // 17
    this._start();                                                                                       // 18
  }                                                                                                      // 19
                                                                                                         // 20
  if (_.isObject(path) && ! _.isRegExp(path)) {                                                          // 21
    _.each(path, function(endpoint, p) {                                                                 // 22
      self.add(p, endpoint);                                                                             // 23
    });                                                                                                  // 24
  } else {                                                                                               // 25
    if (! endpoint) {                                                                                    // 26
      // no options were supplied so 2nd parameter is the endpoint                                       // 27
      endpoint = options;                                                                                // 28
      options = null;                                                                                    // 29
    }                                                                                                    // 30
    if (! _.isFunction(endpoint)) {                                                                      // 31
      endpoint = _.bind(_.identity, null, endpoint);                                                     // 32
    }                                                                                                    // 33
    self._routes.push([new RESTstop.Route(self._config.api_path + path, options), endpoint]);            // 34
  }                                                                                                      // 35
};                                                                                                       // 36
                                                                                                         // 37
_RESTstop.prototype.match = function(request, response) {                                                // 38
  for (var i = 0; i < this._routes.length; i++) {                                                        // 39
    var params = {}, route = this._routes[i];                                                            // 40
                                                                                                         // 41
    if (route[0].match(request.url, request.method, params)) {                                           // 42
      context = {request: request, response: response, params: params};                                  // 43
                                                                                                         // 44
      var args = [];                                                                                     // 45
      for (var key in context.params)                                                                    // 46
        args.push(context.params[key]);                                                                  // 47
                                                                                                         // 48
      if(request.method == "POST" || request.method == "PUT") {                                          // 49
        _.extend(context.params, request.body);                                                          // 50
      }                                                                                                  // 51
      if(request.method == "GET" || _.size(request.query)) {                                             // 52
        _.extend(context.params, request.query);                                                         // 53
      }                                                                                                  // 54
                                                                                                         // 55
      if(this._config.use_auth) {                                                                        // 56
        context.user = false;                                                                            // 57
                                                                                                         // 58
        var userId = context.params.userId;                                                              // 59
        var loginToken = context.params.loginToken;                                                      // 60
                                                                                                         // 61
        if(request.headers['x-login-token']) {                                                           // 62
          loginToken = request.headers['x-login-token'];                                                 // 63
        }                                                                                                // 64
        if(request.headers['x-user-id']) {                                                               // 65
          userId = request.headers['x-user-id'];                                                         // 66
        }                                                                                                // 67
                                                                                                         // 68
        // Get the user object                                                                           // 69
        if(userId && loginToken) {                                                                       // 70
          context.user = Meteor.users.findOne({                                                          // 71
            _id: userId,                                                                                 // 72
            "services.resume.loginTokens.token": loginToken                                              // 73
          });                                                                                            // 74
        }                                                                                                // 75
                                                                                                         // 76
        // Return an error if no user and login required                                                 // 77
        if(route[0].options.require_login && !context.user) {                                            // 78
          return [403, {success: false, message: "You must be logged in to do this."}];                  // 79
        }                                                                                                // 80
      }                                                                                                  // 81
                                                                                                         // 82
      try {                                                                                              // 83
        return route[1].apply(context, args);                                                            // 84
      } catch (e) {                                                                                      // 85
        return [e.error || 404, {success: false, message: e.reason || e.message}];                       // 86
      }                                                                                                  // 87
    }                                                                                                    // 88
  }                                                                                                      // 89
  return false;                                                                                          // 90
};                                                                                                       // 91
                                                                                                         // 92
_RESTstop.prototype.configure = function(config){                                                        // 93
  if(this._started){                                                                                     // 94
    throw new Error("RESTstop.configure() has to be called before first call to RESTstop.add()");        // 95
  }                                                                                                      // 96
                                                                                                         // 97
  _.extend(this._config, config);                                                                        // 98
                                                                                                         // 99
  if(this._config.api_path[0] != "/") {                                                                  // 100
    this._config.api_path = "/"  +this._config.api_path;                                                 // 101
  }                                                                                                      // 102
};                                                                                                       // 103
                                                                                                         // 104
_RESTstop.prototype._start = function(){                                                                 // 105
  var self = this;                                                                                       // 106
                                                                                                         // 107
  if(this._started){                                                                                     // 108
    throw new Error("RESTstop has already been started");                                                // 109
  }                                                                                                      // 110
                                                                                                         // 111
  this._started = true;                                                                                  // 112
                                                                                                         // 113
  // hook up the serving                                                                                 // 114
  RoutePolicy.declare('/' + this._config.api_path + '/', 'network');                                     // 115
                                                                                                         // 116
  var self = this,                                                                                       // 117
      connect = Npm.require("connect");                                                                  // 118
                                                                                                         // 119
  WebApp.connectHandlers.use(connect.query());                                                           // 120
  WebApp.connectHandlers.use(connect.bodyParser());                                                      // 121
  WebApp.connectHandlers.use(function(req, res, next) {                                                  // 122
    if (req.url.slice(0, self._config.api_path.length) !== self._config.api_path) {                      // 123
      return next();                                                                                     // 124
    }                                                                                                    // 125
                                                                                                         // 126
    // need to wrap in a fiber in case they do something async                                           // 127
    // (e.g. in the database)                                                                            // 128
    if(typeof(Fiber)=="undefined") Fiber = Npm.require('fibers');                                        // 129
                                                                                                         // 130
    Fiber(function() {                                                                                   // 131
      res.statusCode = 200; // 200 response, by default                                                  // 132
      var output = RESTstop.match(req, res);                                                             // 133
                                                                                                         // 134
      if (output === false) {                                                                            // 135
        output = [404, {success: false, message:'API method not found'}];                                // 136
      }                                                                                                  // 137
                                                                                                         // 138
      // parse out the various type of response we can have                                              // 139
                                                                                                         // 140
      // array can be                                                                                    // 141
      // [content], [status, content], [status, headers, content]                                        // 142
      if (_.isArray(output)) {                                                                           // 143
        // copy the array so we aren't actually modifying it!                                            // 144
        output = output.slice(0);                                                                        // 145
                                                                                                         // 146
        if (output.length === 3) {                                                                       // 147
          var headers = output.splice(1, 1)[0];                                                          // 148
          _.each(headers, function(value, key) {                                                         // 149
            res.setHeader(key, value);                                                                   // 150
          });                                                                                            // 151
        }                                                                                                // 152
                                                                                                         // 153
        if (output.length === 2) {                                                                       // 154
          res.statusCode = output.shift();                                                               // 155
        }                                                                                                // 156
                                                                                                         // 157
        output = output[0];                                                                              // 158
      }                                                                                                  // 159
                                                                                                         // 160
      if (_.isNumber(output)) {                                                                          // 161
        res.statusCode = output;                                                                         // 162
        output = '';                                                                                     // 163
      }                                                                                                  // 164
                                                                                                         // 165
      if(_.isObject(output)) {                                                                           // 166
        output = JSON.stringify(output);                                                                 // 167
        res.setHeader("Content-Type", "text/json");                                                      // 168
      }                                                                                                  // 169
                                                                                                         // 170
      return res.end(output);                                                                            // 171
    }).run();                                                                                            // 172
  });                                                                                                    // 173
                                                                                                         // 174
  if(this._config.use_auth) {                                                                            // 175
    RESTstop.initAuth();                                                                                 // 176
  }                                                                                                      // 177
};                                                                                                       // 178
                                                                                                         // 179
_RESTstop.prototype.call = function (context, name, args) {                                              // 180
  var args = Array.prototype.slice.call(arguments, 2);                                                   // 181
  return this._apply(context, name, args, 'method_handlers');                                            // 182
};                                                                                                       // 183
                                                                                                         // 184
_RESTstop.prototype.apply = function (context, name, args) {                                             // 185
  return this._apply(context, name, args, 'method_handlers');                                            // 186
};                                                                                                       // 187
                                                                                                         // 188
_RESTstop.prototype.getPublished = function (context, name, args) {                                      // 189
  return this._apply(context, name, args, 'publish_handlers');                                           // 190
};                                                                                                       // 191
                                                                                                         // 192
MethodInvocation = function (options) {                                                                  // 193
  var self = this;                                                                                       // 194
                                                                                                         // 195
  // true if we're running not the actual method, but a stub (that is,                                   // 196
  // if we're on a client (which may be a browser, or in the future a                                    // 197
  // server connecting to another server) and presently running a                                        // 198
  // simulation of a server-side method for latency compensation                                         // 199
  // purposes). not currently true except in a client such as a browser,                                 // 200
  // since there's usually no point in running stubs unless you have a                                   // 201
  // zero-latency connection to the user.                                                                // 202
  this.isSimulation = options.isSimulation;                                                              // 203
                                                                                                         // 204
  // call this function to allow other method invocations (from the                                      // 205
  // same client) to continue running without waiting for this one to                                    // 206
  // complete.                                                                                           // 207
  this._unblock = options.unblock || function () {};                                                     // 208
  this._calledUnblock = false;                                                                           // 209
                                                                                                         // 210
  // current user id                                                                                     // 211
  this.userId = options.userId;                                                                          // 212
                                                                                                         // 213
  // sets current user id in all appropriate server contexts and                                         // 214
  // reruns subscriptions                                                                                // 215
  this._setUserId = options.setUserId || function () {};                                                 // 216
                                                                                                         // 217
  // used for associating the connection with a login token so that the                                  // 218
  // connection can be closed if the token is no longer valid                                            // 219
  this._setLoginToken = options._setLoginToken || function () {};                                        // 220
                                                                                                         // 221
  // Scratch data scoped to this connection (livedata_connection on the                                  // 222
  // client, livedata_session on the server). This is only used                                          // 223
  // internally, but we should have real and documented API for this                                     // 224
  // sort of thing someday.                                                                              // 225
  this._sessionData = options.sessionData;                                                               // 226
};                                                                                                       // 227
                                                                                                         // 228
_.extend(MethodInvocation.prototype, {                                                                   // 229
  unblock: function () {                                                                                 // 230
    var self = this;                                                                                     // 231
    self._calledUnblock = true;                                                                          // 232
    self._unblock();                                                                                     // 233
  },                                                                                                     // 234
  setUserId: function(userId) {                                                                          // 235
    var self = this;                                                                                     // 236
    if (self._calledUnblock)                                                                             // 237
      throw new Error("Can't call setUserId in a method after calling unblock");                         // 238
    self.userId = userId;                                                                                // 239
    self._setUserId(userId);                                                                             // 240
  },                                                                                                     // 241
  _setLoginToken: function (token) {                                                                     // 242
    this._setLoginToken(token);                                                                          // 243
    this._sessionData.loginToken = token;                                                                // 244
  },                                                                                                     // 245
  _getLoginToken: function (token) {                                                                     // 246
    return this._sessionData.loginToken;                                                                 // 247
  }                                                                                                      // 248
});                                                                                                      // 249
                                                                                                         // 250
_RESTstop.prototype._apply = function (context, name, args, handler_name) {                              // 251
  var self = Meteor.default_server;                                                                      // 252
                                                                                                         // 253
  // Run the handler                                                                                     // 254
  var handler = self[handler_name][name];                                                                // 255
  var exception;                                                                                         // 256
  if (!handler) {                                                                                        // 257
    exception = new Meteor.Error(404, "Method not found");                                               // 258
  } else {                                                                                               // 259
                                                                                                         // 260
    var userId = context.user ? context.user._id : null;                                                 // 261
    var setUserId = function() {                                                                         // 262
      throw new Error("Can't call setUserId on a server initiated method call");                         // 263
    };                                                                                                   // 264
                                                                                                         // 265
    var invocation = new MethodInvocation({                                                              // 266
      isSimulation: false,                                                                               // 267
      userId: context.user._id, setUserId: setUserId,                                                    // 268
      sessionData: self.sessionData                                                                      // 269
    });                                                                                                  // 270
                                                                                                         // 271
    try {                                                                                                // 272
      var result = DDP._CurrentInvocation.withValue(invocation, function () {                            // 273
        return maybeAuditArgumentChecks(                                                                 // 274
          handler, invocation, args, "internal call to '" + name + "'");                                 // 275
      });                                                                                                // 276
    } catch (e) {                                                                                        // 277
      exception = e;                                                                                     // 278
    }                                                                                                    // 279
  }                                                                                                      // 280
                                                                                                         // 281
  if (exception)                                                                                         // 282
    throw exception;                                                                                     // 283
  return result;                                                                                         // 284
};                                                                                                       // 285
                                                                                                         // 286
var maybeAuditArgumentChecks = function (f, context, args, description) {                                // 287
  args = args || [];                                                                                     // 288
  if (Package['audit-argument-checks']) {                                                                // 289
    return Match._failIfArgumentsAreNotAllChecked(                                                       // 290
      f, context, args, description);                                                                    // 291
  }                                                                                                      // 292
  return f.apply(context, args);                                                                         // 293
};                                                                                                       // 294
                                                                                                         // 295
// Make the router available                                                                             // 296
RESTstop = new _RESTstop();                                                                              // 297
                                                                                                         // 298
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
    login.success = true;                                                                                // 71
    return login;                                                                                        // 72
  });                                                                                                    // 73
                                                                                                         // 74
  RESTstop.add('logout', {'method': 'GET', require_login: true}, function() {                            // 75
    var loginToken = this.params.loginToken;                                                             // 76
    if(this.request.headers['x-login-token']) {                                                          // 77
      loginToken = this.request.headers['x-login-token'];                                                // 78
    }                                                                                                    // 79
                                                                                                         // 80
    // Log the user out                                                                                  // 81
    Meteor.users.update(                                                                                 // 82
    this.user._id, {$pull: {'services.resume.loginTokens': {token: loginToken}}});                       // 83
                                                                                                         // 84
    return {success: true, message: "You've been logged out!"};                                          // 85
  });                                                                                                    // 86
};                                                                                                       // 87
                                                                                                         // 88
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.reststop2 = {
  RESTstop: RESTstop
};

})();

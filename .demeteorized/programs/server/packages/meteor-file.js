(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;
var EJSON = Package.ejson.EJSON;

/* Package-scope variables */
var MeteorFile;

(function () {

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/meteor-file/meteor-file.js                                           //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
/************************ Client and Server **********************************/  // 1
function defaultZero (value) {                                                   // 2
  return _.isUndefined(value) ? 0 : value;                                       // 3
}                                                                                // 4
                                                                                 // 5
MeteorFile = function (doc, options) {                                           // 6
  options = options || {};                                                       // 7
  doc = doc || {};                                                               // 8
  this._id = doc._id || Meteor.uuid();                                           // 9
  this.name = doc.name;                                                          // 10
  this.type = doc.type;                                                          // 11
  this.size = doc.size;                                                          // 12
  this.data = doc.data;                                                          // 13
  this.start = defaultZero(doc.start);                                           // 14
  this.end = defaultZero(doc.end);                                               // 15
  this.bytesRead = defaultZero(doc.bytesRead);                                   // 16
  this.bytesUploaded = defaultZero(doc.bytesUploaded);                           // 17
                                                                                 // 18
  this.collection = options.collection;                                          // 19
  this.readProgress = defaultZero(doc.readProgress);                             // 20
  this.uploadProgress = defaultZero(doc.uploadProgress);                         // 21
};                                                                               // 22
                                                                                 // 23
MeteorFile.fromJSONValue = function (value) {                                    // 24
  return new MeteorFile({                                                        // 25
    _id: value._id,                                                              // 26
    name: value.name,                                                            // 27
    type: value.type,                                                            // 28
    size: value.size,                                                            // 29
    data: EJSON.fromJSONValue(value.data),                                       // 30
    start: value.start,                                                          // 31
    end: value.end,                                                              // 32
    bytesRead: value.bytesRead,                                                  // 33
    bytesUploaded: value.bytesUploaded,                                          // 34
    readProgress: value.readProgress,                                            // 35
    uploadProgress: value.uploadProgress                                         // 36
  });                                                                            // 37
};                                                                               // 38
                                                                                 // 39
MeteorFile.humanize = function (size) {                                          // 40
  var gb = Math.pow(1024, 3);                                                    // 41
  var mb = Math.pow(1024, 2);                                                    // 42
  var kb = 1024;                                                                 // 43
                                                                                 // 44
  if (size >= gb)                                                                // 45
    return Math.floor(size / gb) + ' GB';                                        // 46
  else if (size >= 1024^2)                                                       // 47
    return Math.floor(size / mb) + ' MB';                                        // 48
  else if (size >= 1024)                                                         // 49
    return Math.floor(size / kb) + ' KB';                                        // 50
  else                                                                           // 51
    return size + ' Bytes';                                                      // 52
};                                                                               // 53
                                                                                 // 54
MeteorFile.prototype = {                                                         // 55
  constructor: MeteorFile,                                                       // 56
                                                                                 // 57
  typeName: function () {                                                        // 58
    return "MeteorFile";                                                         // 59
  },                                                                             // 60
                                                                                 // 61
  equals: function (other) {                                                     // 62
    return other._id == this._id;                                                // 63
  },                                                                             // 64
                                                                                 // 65
  clone: function () {                                                           // 66
    return new MeteorFile({                                                      // 67
      name: this.name,                                                           // 68
      type: this.type,                                                           // 69
      size: this.size,                                                           // 70
      data: this.data,                                                           // 71
      start: this.start,                                                         // 72
      end: this.end,                                                             // 73
      bytesRead: this.bytesRead,                                                 // 74
      bytesUploaded: this.bytesUploaded,                                         // 75
      _id: this._id,                                                             // 76
      readProgress: this.readProgress,                                           // 77
      uploadProgress: this.uploadProgress                                        // 78
    });                                                                          // 79
  },                                                                             // 80
                                                                                 // 81
  toJSONValue: function () {                                                     // 82
    return {                                                                     // 83
      _id: this._id,                                                             // 84
      name: this.name,                                                           // 85
      type: this.type,                                                           // 86
      size: this.size,                                                           // 87
      data: EJSON.toJSONValue(this.data),                                        // 88
      start: this.start,                                                         // 89
      end: this.end,                                                             // 90
      bytesRead: this.bytesRead,                                                 // 91
      bytesUploaded: this.bytesUploaded,                                         // 92
      readProgress: this.readProgress,                                           // 93
      uploadProgress: this.uploadProgress                                        // 94
    };                                                                           // 95
  }                                                                              // 96
};                                                                               // 97
                                                                                 // 98
EJSON.addType("MeteorFile", MeteorFile.fromJSONValue);                           // 99
/*****************************************************************************/  // 100
                                                                                 // 101
/************************ Client *********************************************/  // 102
if (Meteor.isClient) {                                                           // 103
  _.extend(MeteorFile.prototype, {                                               // 104
    read: function (file, options, callback) {                                   // 105
      if (arguments.length == 2)                                                 // 106
        callback = options;                                                      // 107
                                                                                 // 108
      options = options || {};                                                   // 109
                                                                                 // 110
      var reader = new FileReader;                                               // 111
      var self = this;                                                           // 112
      var chunkSize = options.size || 1024 * 1024 * 2; /* 2MB */                 // 113
                                                                                 // 114
      self.size = file.size;                                                     // 115
      self.start = self.end;                                                     // 116
      self.end += chunkSize;                                                     // 117
                                                                                 // 118
      if (self.end > self.size)                                                  // 119
        self.end = self.size;                                                    // 120
                                                                                 // 121
      reader.onload = function () {                                              // 122
        self.bytesRead += self.end - self.start;                                 // 123
        self.data = new Uint8Array(reader.result);                               // 124
        self._setStatus();                                                       // 125
        callback && callback(null, self);                                        // 126
      };                                                                         // 127
                                                                                 // 128
      reader.onerror = function () {                                             // 129
        self._setStatus(reader.error);                                           // 130
        callback && callback(reader.error);                                      // 131
      };                                                                         // 132
                                                                                 // 133
      if ((this.end - this.start) > 0) {                                         // 134
        var blob = file.slice(self.start, self.end);                             // 135
        reader.readAsArrayBuffer(blob);                                          // 136
      }                                                                          // 137
                                                                                 // 138
      return this;                                                               // 139
    },                                                                           // 140
                                                                                 // 141
    rewind: function () {                                                        // 142
      this.data = null;                                                          // 143
      this.start = 0;                                                            // 144
      this.end = 0;                                                              // 145
      this.bytesRead = 0;                                                        // 146
      this.bytesUploaded = 0;                                                    // 147
      this.readProgress = 0;                                                     // 148
      this.uploadProgress = 0;                                                   // 149
    },                                                                           // 150
                                                                                 // 151
    upload: function (file, method, options, callback) {                         // 152
      var self = this;                                                           // 153
                                                                                 // 154
      if (!Blob.prototype.isPrototypeOf(file))                                   // 155
        throw new Meteor.Error("First parameter must inherit from Blob");        // 156
                                                                                 // 157
      if (!_.isString(method))                                                   // 158
        throw new Meteor.Error("Second parameter must be a Meteor.method name"); // 159
                                                                                 // 160
      if (arguments.length < 4 && _.isFunction(options)) {                       // 161
        callback = options;                                                      // 162
        options = {};                                                            // 163
      }                                                                          // 164
                                                                                 // 165
      options = options || {};                                                   // 166
      self.rewind();                                                             // 167
      self.size = file.size;                                                     // 168
                                                                                 // 169
      var readNext = function () {                                               // 170
        if (self.bytesUploaded < self.size) {                                    // 171
          self.read(file, options, function (err, res) {                         // 172
            if (err) {                                                           // 173
              self.rewind();                                                     // 174
              callback && callback(err);                                         // 175
            }                                                                    // 176
            else {                                                               // 177
              Meteor.apply(                                                      // 178
                method,                                                          // 179
                [self].concat(options.params || []),                             // 180
                {                                                                // 181
                  wait: true                                                     // 182
                },                                                               // 183
                function (err) {                                                 // 184
                  if (err) {                                                     // 185
                    self.rewind();                                               // 186
                    self._setStatus(err);                                        // 187
                    callback && callback(err);                                   // 188
                  }                                                              // 189
                  else {                                                         // 190
                    self.bytesUploaded += self.data.length;                      // 191
                    self._setStatus();                                           // 192
                    readNext();                                                  // 193
                  }                                                              // 194
                }                                                                // 195
              );                                                                 // 196
            }                                                                    // 197
          });                                                                    // 198
        } else {                                                                 // 199
          self._setStatus();                                                     // 200
          callback && callback(null, self);                                      // 201
        }                                                                        // 202
      };                                                                         // 203
                                                                                 // 204
      readNext();                                                                // 205
      return this;                                                               // 206
    },                                                                           // 207
                                                                                 // 208
    _setStatus: function (err) {                                                 // 209
      this.readProgress = Math.round(this.bytesRead/this.size * 100);            // 210
      this.uploadProgress = Math.round(this.bytesUploaded/this.size * 100);      // 211
                                                                                 // 212
      if (err)                                                                   // 213
        this.status = err.toString();                                            // 214
      else if (this.uploadProgress == 100)                                       // 215
        this.status = "Upload complete";                                         // 216
      else if (this.uploadProgress > 0)                                          // 217
        this.status = "File uploading";                                          // 218
      else if (this.readProgress > 0)                                            // 219
        this.status = "File loading";                                            // 220
                                                                                 // 221
      if (this.collection) {                                                     // 222
        this.collection.update(this._id, {                                       // 223
          $set: {                                                                // 224
            status: this.status,                                                 // 225
            readProgress: this.readProgress,                                     // 226
            uploadProgress: this.uploadProgress                                  // 227
          }                                                                      // 228
        });                                                                      // 229
      }                                                                          // 230
    }                                                                            // 231
  });                                                                            // 232
                                                                                 // 233
  _.extend(MeteorFile, {                                                         // 234
    read: function (file, options, callback) {                                   // 235
      return new MeteorFile(file).read(file, options, callback);                 // 236
    },                                                                           // 237
                                                                                 // 238
    upload: function (file, method, options, callback) {                         // 239
      return new MeteorFile(file).upload(file, method, options, callback);       // 240
    }                                                                            // 241
  });                                                                            // 242
}                                                                                // 243
/*****************************************************************************/  // 244
                                                                                 // 245
/************************ Server *********************************************/  // 246
if (Meteor.isServer) {                                                           // 247
  var fs = Npm.require('fs');                                                    // 248
  var path = Npm.require('path');                                                // 249
                                                                                 // 250
  function sanitize (fileName) {                                                 // 251
    return fileName                                                              // 252
      .replace(/\//g, '')                                                        // 253
      .replace(/\.\.+/g, '.')                                                    // 254
  }                                                                              // 255
                                                                                 // 256
  _.extend(MeteorFile.prototype, {                                               // 257
    save: function (dirPath, options) {                                          // 258
      var filepath = path.join(dirPath, sanitize(this.name));                    // 259
      var buffer = new Buffer(this.data);                                        // 260
      var mode = this.start == 0 ? 'w' : 'a';                                    // 261
      var fd = fs.openSync(filepath, mode);                                      // 262
      fs.writeSync(fd, buffer, 0, buffer.length, this.start);                    // 263
      fs.closeSync(fd);                                                          // 264
    }                                                                            // 265
  });                                                                            // 266
}                                                                                // 267
/*****************************************************************************/  // 268
                                                                                 // 269
///////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['meteor-file'] = {
  MeteorFile: MeteorFile
};

})();

(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var CSV;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/node-csv-npm/lib/node-csv.js                             //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
CSV = Npm.require("csv");                                            // 1
                                                                     // 2
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['node-csv-npm'] = {
  CSV: CSV
};

})();

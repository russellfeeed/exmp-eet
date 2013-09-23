  Meteor.startup(function () {
    // code to run on server at startup
     Meteor.publish("alltheemails", function () { return reas.find({},{sort: {lastname:0}}); });
    
  });
  
  

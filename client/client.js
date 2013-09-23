   Meteor.subscribe("alltheemails");
   
   var alloweddomains = [{domain: 'exertismicro-p.co.uk'},
                {domain: 'exertisgem.co.uk'}, 
                {domain: 'exertis.ie'}];
    

  function resetSessionVars() {        
      Session.set('firstname','firstname');
      Session.set('lastname','lastname');
      Session.set('email','');
      Session.set('emailshort','');
    
      Session.set('isemailvalid','');
      Session.set('isemailavailable','');

      Session.set('suggestedalternative', '');
      Session.set('suggestedalternativeshort', '');
      
      Session.set('domain', alloweddomains[0].domain);
      
      Session.set('sortexpression',{sort: {lastname:0}});
      
      
  }
  
 
    resetSessionVars();
  
  

  
  Template.hello.greeting = function () {
    return "Welcome to EEAT - the Exertis Email Address Tool.";
  };
  
  Template.builtemail.builtemail = function(){
      Session.set('email', Session.get('firstname').toLowerCase().replace("'",'').replace(" ",'')+'.'+Session.get('lastname').toLowerCase().replace("'",'').replace(" ",''));
      return Session.get('email');
  };

  Template.builtemail.builtemailshort = function(){
      Session.set('emailshort', Session.get('firstname').toLowerCase().replace("'",'').replace(" ",'').charAt(0)+'.'+Session.get('lastname').toLowerCase().replace("'",'').replace(" ",''));
      return Session.get('emailshort');
  };


Template.builtemail.domain = function(){
    return Session.get('domain');
}

  Template.emailchecks.isemailvalid = function(){
      var valid=true;
      if (Session.get('firstname')=='' || Session.get('lastname')==''){
        valid=false;
      }
        
      Session.set('isemailvalid', valid ? 'valid' : 'invalid');
      return Session.get('isemailvalid');
  }
  
  
  Template.emailchecks.isemailavailable = function(){
      var available=true;
      
      if (reas.findOne({email:Session.get('email')+"@"+Session.get('domain')})){
        available=false;
      }
        
      Session.set('isemailavailable', available ? 'available' : 'taken');
      return Session.get('isemailavailable');
  }
  

  Template.builtemail.suggestedalternative = function(){
      var suggestedalternative='no suggestion';
      var suggestedalternativeshort='no suggestion';
      
      if (Session.get('isemailavailable')=='taken'){
        var suffix = 2;
        while (true) {
            suggestedalternative=Session.get('firstname').toLowerCase().replace("'",'').replace(" ",'')+'.'+Session.get('lastname').toLowerCase().replace("'",'').replace("",'')+suffix;
            suggestedalternativeshort=Session.get('firstname').toLowerCase().replace("'",'').replace(" ",'').charAt(0)+'.'+Session.get('lastname').toLowerCase().replace("'",'').replace(" ",'')+suffix;
            if (!reas.findOne({email:suggestedalternative+'@'+Sesson.get('domain')})){
                break; // stop trying to increment the suffix to find a free email address
            }
            suffix++;
        }
      }
        
      Session.set('suggestedalternative', suggestedalternative);
      Session.set('suggestedalternativeshort', suggestedalternativeshort);
      return Session.get('suggestedalternative');
  }
  
  
  
  Template.form.alloweddomains = function() {
      return alloweddomains;
  }
  
  
  Template.form.submitbuttondisabled = function() {
      return Session.get('isemailvalid')=='valid' ? 'enabled' : 'disabled';
  }

  Template.form.events({
      
    
    // inputs  
    'keyup input.nameinput' : function (event) {
      // template data, if any, is available in 'this'
      //if (typeof console !== 'undefined')
        //console.log($(event.target).attr('id')+': '+$(event.target).val().trim());

      Session.set($(event.target).attr('id'), $(event.target).val().trim());
    },

    // domains  
    'change select#domain' : function (event) {
      // template data, if any, is available in 'this'
      //if (typeof console !== 'undefined')
        //console.log($(event.target).attr('id')+': '+$(event.target).val().trim());

      Session.set($(event.target).attr('id'), $(event.target).val().trim());
    },

    
    // save
    'click button#save' : function(event) {
        
        var email, emailshort;
        
        if (Session.get('isemailavailable')=='taken' && Session.get('email')!=Session.get('suggestedalternative')) {
            email = Session.get('suggestedalternative');
            emailshort = Session.get('suggestedalternativeshort');
        } else {
            email = Session.get('email');
            emailshort = Session.get('emailshort');
        }
        

        var newRecord = {
                        'firstname':Session.get('firstname'),
                        'lastname':Session.get('lastname'),
                        'email': email,
                        'emailshort': emailshort,
                        'emailmain': emailmain,
                        'domain': Session.get('domain')
                    };

        reas.insert(newRecord);

        
        //Meteor.call(newRecord, 1, function(e, r) {});
        resetSessionVars();
        
        $('input.nameinput').val('');
        $('input.nameinput:first').focus();
        return false;            
                    
    }

  });
  
  
  Template.allemailstbody.events( {
      'click input.delete': function (event) {
                                event.preventDefault();
                                if(confirm("Delete "+this.email+". Are you sure?")) {
                                    reas.remove(this._id);
                                }
                              },
  });
  
  
  
  
  Template.allemailstbody.alltheemails = function() {
      
      var filter = [];
      
      
      if (Session.get('firstnamefilter')) {
        filter.push({firstname: { $regex: Session.get('firstnamefilter'), $options:"i" } });
      } 

      if (Session.get('lastnamefilter')) {
        filter.push({lastname: { $regex: Session.get('lastnamefilter'), $options:"i" } });
      } 

      if (Session.get('emailfilter')) {
        filter.push({email: { $regex: Session.get('emailfilter'), $options:"i" } });
      } 

      
      if (filter.length) 
        return reas.find({$or: filter}, {sort: Session.get('sortexpression')}).fetch();
      else 
        return reas.find({}, {sort: Session.get('sortexpression') }).fetch();
      
  } // alltheemails
  
  
  
  
   Template.allemails.emailcount = function() {
      //return reas.find({}, {sort: {lastname:1}}).count();
      return reas.find({}).count();
  }
  
  
  Template.allemails.events( {
      'click th.sort': function (event) {
                                  var sortcol = $(event.target).attr('id');
                                  var sortObj = {};
                                  sortObj[sortcol] = 1;
                                  Session.set(
                                            'sortexpression',  sortObj
                                           );
                                           
                                  $('th.sort i').hide();
                                  $(event.target).find('i').css('display', 'inline-block');
                              }
         
  });
  
  Template.loggedInInfo.currentUsername = function() {
      return Meteor.user().username;
  }
 

Template.allemailsfilterbar.events({
    'keyup input.filter' : function (event) {
        Session.set($(event.target).attr('name'),$(event.target).val().trim())
    }
});


Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});





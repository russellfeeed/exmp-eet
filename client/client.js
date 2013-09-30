String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

String.prototype.clean = function() {
    str = this.replace(/'/g,'').replace(/\s/g,'').replace(/_/g,'');
    return str;
}

   Meteor.subscribe("alltheemails");
   
   var alloweddomains = [{domain: 'exertismicro-p.co.uk'},
                {domain: 'exertisgem.co.uk'}, 
                {domain: 'exertis.ie'}];
    

  function resetSessionVars() {        
      Session.set('firstname','Firstname');
      Session.set('lastname','Lastname');
      Session.set('middleinitial','');
      Session.set('email','');
      Session.set('emailshort','');
    
      Session.set('isemailvalid','');
      Session.set('isemailavailable','');

      Session.set('suggestedalternative', '');
      Session.set('suggestedalternativeshort', '');
      
      Session.set('domain', alloweddomains[0].domain);
      
      Session.set('sortexpression',{sort: {lastname:0}});
      
      Session.set('groupdomain','exertis.com');

      $("#nameform input[value='']:not(:checkbox,:button):visible:first").focus();
  }
  
 
 function nameWithMiddleInitial() {
  return Session.get('firstname').toLowerCase().clean()+'.'+Session.get('middleinitial').toLowerCase()+'.'+Session.get('lastname').toLowerCase().clean();
 } // nameWithMiddelInitial
 
 
 
    resetSessionVars();
  
  

  
  Template.hello.greeting = function () {
    return "Welcome to EEAT - the Exertis Email Address Tool.";
  };
  
  Template.builtemail.builtemail = function(){
      Session.set('email', Session.get('firstname').toLowerCase().clean()+'.'+Session.get('lastname').toLowerCase().clean());
      return Session.get('email');
  };

  Template.builtemail.builtemailshort = function(){
      Session.set('emailshort', Session.get('firstname').toLowerCase().clean().charAt(0)+'.'+Session.get('lastname').toLowerCase().clean());
      return Session.get('emailshort');
  };


Template.builtemail.domain = function(){
    return Session.get('domain');
};

  Template.emailchecks.isemailvalid = function(){
      var valid=true;
      if (Session.get('firstname')=='' || Session.get('lastname')==''){
        valid=false;
      }
        
      Session.set('isemailvalid', valid ? 'valid' : 'invalid');
      return Session.get('isemailvalid');
  };
  
  
  Template.emailchecks.isemailavailable = function(){
      var available=true;
      
      if (reas.findOne({email:Session.get('email')+"@"+Session.get('domain')})){
        available=false;
      }
        
      Session.set('isemailavailable', available ? 'available' : 'taken');
      return Session.get('isemailavailable');
  };
  

  Template.builtemail.suggestion = function(){
      var suggestedalternative='no suggestion';
      var suggestedalternativeshort='no suggestion';
      
      if (Session.get('isemailavailable')=='taken'){
          
        // first try with middle initial added
        suggestedalternative = nameWithMiddleInitial();
        suggestedalternativeshort=Session.get('firstname').toLowerCase().clean().charAt(0)+'.'+Session.get('middleinitial')+'.'+Session.get('lastname').toLowerCase().clean();
        if (reas.findOne({emailmain:suggestedalternative+'@'+Session.get('groupdomain')})){
            // name with initial already taken.
            // try adding numbers to the end
            var suffix = 2;
            while (true) {
                suggestedalternativewithnum=suggestedalternative+suffix;
                suggestedalternativeshortwithnum=Session.get('firstname').toLowerCase().clean().charAt(0)+'.'+Session.get('middleinitial')+'.'+Session.get('lastname').toLowerCase().clean()+suffix;
                if (!reas.findOne({emailmain:suggestedalternativewithnum+'@'+Session.get('groupdomain')})){
                    break; // stop trying to increment the suffix to find a free email address
                }
                suffix++;
            } // while                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          main
            Session.set('suggestedalternative', suggestedalternativewithnum);
            Session.set('suggestedalternativeshort', suggestedalternativeshortwithnum);
        } else {
            // We can use just the initial to make it unique
            Session.set('suggestedalternative', suggestedalternative);
            Session.set('suggestedalternativeshort', suggestedalternativeshort);
            
        }
      }
        
      return Session.get('suggestedalternative');
  };
  
  
  Template.builtemail.emailmain = function() {
      if (Session.get('isemailavailable')=='taken' && Session.get('email')!=Session.get('suggestedalternative')) {
        Session.set('emailmain', Session.get('suggestedalternative'));
      } else {
        Session.set('emailmain', Session.get('email'));
          
      }
      return Session.get('emailmain');
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
      val = $(event.target).val().trim().capitalize();
      Session.set($(event.target).attr('id'), val);
      $(event.target).val(val);
    },
            
    'keyup input.initialinput' : function (event) {
      // template data, if any, is available in 'this'
      //if (typeof console !== 'undefined')
        //console.log($(event.target).attr('id')+': '+$(event.target).val().trim());

      val = $(event.target).val().trim().capitalize().charAt(0);
      Session.set($(event.target).attr('id'), val.toLowerCase());
      $(event.target).val(val);
      // focus next input automatically
      $("#nameform input[value='']:not(:checkbox,:button):visible:first").focus();
      
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
        
        var email, emailshort, emailmain;
        
        if (Session.get('isemailavailable')=='taken' && Session.get('email')!=Session.get('suggestedalternative')) {
            email = Session.get('suggestedalternative')+'@'+Session.get('domain');
            emailshort = Session.get('suggestedalternativeshort')+'@'+Session.get('domain');
            emailmain = Session.get('suggestedalternative')+'@exertis.com';
        } else {
            email = Session.get('email')+'@'+Session.get('domain');
            emailshort = Session.get('emailshort')+'@'+Session.get('domain');
            emailmain = Session.get('emailmain')+'@exertis.com';
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





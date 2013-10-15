String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.clean = function() {
    str = this.replace(/'/g, '').replace(/\s/g, '').replace(/_/g, '');
    return str;
};

Meteor.subscribe("alltheemails");

var alloweddomains = [{domain: 'exertismicro-p.co.uk', company: 'Exertis Micro-P'},
    {domain: 'exertisgem.co.uk', company: 'Exertis Gem'},
    {domain: 'exertis.ie', company: 'Exertis Ireland'}];


function initSessionVars() {
    Session.set('firstname', 'Firstname');
    Session.set('lastname', 'Lastname');
    Session.set('middlename', '');
    Session.set('email', '');
    Session.set('emailshort', '');

    Session.set('isemailvalid', '');
    Session.set('isemailavailable', '');

    Session.set('suggestedalternative', '');
    Session.set('suggestedalternativeshort', '');

    Session.set('domain', alloweddomains[0].domain);

    Session.set('sortexpression', {sort: {lastname: 0}});

    Session.set('groupdomain', 'exertis.com');
    
    Session.set('usermessage', false);

    $("#nameform input[value='']:not(:checkbox,:button):visible:first").focus();
    $('#nomiddlename').removeAttr('checked');
}



function resetSessionVars() {
    Session.set('firstname', 'Firstname');
    Session.set('lastname', 'Lastname');
    Session.set('middlename', '');
    Session.set('email', '');
    Session.set('emailshort', '');

    Session.set('isemailvalid', '');
    Session.set('isemailavailable', '');

    Session.set('suggestedalternative', '');
    Session.set('suggestedalternativeshort', '');

    Session.set('usermessage', false);

    $("#nameform input[value='']:not(:checkbox,:button):visible:first").focus();
    $('#nomiddlename').removeAttr('checked');
}












Template.hello.greeting = function() {
    return "Welcome to EEAT - the Exertis Email Address Tool.";
};

Template.builtemail.builtemail = function() {
    Session.set('email', Session.get('firstname').toLowerCase().clean().removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
    return Session.get('email');
};

Template.builtemail.builtemailshort = function() {
    Session.set('emailshort', Session.get('firstname').toLowerCase().clean().charAt(0).removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
    return Session.get('emailshort');
};


Template.builtemail.domain = function() {
    return Session.get('domain');
};

Template.emailchecks.helpers({
    isemailvalid: function() {
                        var valid = true;
                        if (Session.get('firstname') == '' || Session.get('lastname') == '') {
                            valid = false;
                        }

                        Session.set('isemailvalid', valid ? 'valid' : 'invalid');
                        return Session.get('isemailvalid');
                    },
                            
    isemailavailable: function() {
                        return Session.get('isemailavailable');
                    },
                            
   emailusedby: function() {
                        var emailusedby = false;

                        emailusedby = reas.findOne({email: Session.get('email') + "@" + Session.get('domain')});
                        
                        if (emailusedby) {
                            Session.set('emailusedby', emailusedby);
                        } else {
                            Session.set('emailusedby', false);
                        }

                        return Session.get('emailusedby');
                    }                            
});



Template.usermsgalert.helpers({
  usermessage: function () {
    return Session.get("usermessage");
  }
});


Template.builtemail.suggestion = function() {
    return Session.get('suggestedalternative');
};


Template.builtemail.emailmain = function() {
    
    return Session.get('emailmain');
};


Template.form.alloweddomains = function() {
    return alloweddomains;
}


Template.form.submitbuttondisabled = function() {
    return Session.get('isemailvalid') == 'valid' ? 'enabled' : 'disabled';
};

Template.form.events({
    // inputs  
    'keyup input.nameinput': function(event) {
        // template data, if any, is available in 'this'
        //if (typeof console !== 'undefined')
        //console.log($(event.target).attr('id')+': '+$(event.target).val().trim());
        val = $(event.target).val().trim().capitalize();
        Session.set($(event.target).attr('id'), val);
        $(event.target).val(val);
    },
    /*'keyup input.initialinput': function(event) {
        // template data, if any, is available in 'this'
        //if (typeof console !== 'undefined')
        //console.log($(event.target).attr('id')+': '+$(event.target).val().trim());

        val = $(event.target).val().trim().capitalize().charAt(0);
        Session.set($(event.target).attr('id'), val.toLowerCase());
        $(event.target).val(val);
        // focus next input automatically
        $("#nameform input[value='']:not(:checkbox,:button):visible:first").focus();

    },*/
    'change #nomiddlename': function(event) {
        var ele = $('input#middlename');
        
        if ($(event.target).attr('checked')) {
            Session.set('usermessage',false);
            ele.attr('disabled', 'disabled');
            Session.set('nomiddlename',true);
        } else { 
            ele.removeAttr('disabled').val('');
            Session.set('nomiddlename',false);
        }
            
    },
    // domains  
    'change select#domain': function(event) {
        // template data, if any, is available in 'this'
        //if (typeof console !== 'undefined')
        //console.log($(event.target).attr('id')+': '+$(event.target).val().trim());

        Session.set($(event.target).attr('id'), $(event.target).val().trim());
    },
    // save
    'click button#save': function(event) {

        var email, emailshort, emailmain;
        
        if (Session.get('middlename')=='' && !$('#nomiddlename:checked').length) {
            // user must explicitly confirm they have no middle name
            Session.set('usermessage', 'Middle name is required, or check the box');
            return false;
        }

        if (Session.get('isemailavailable') == 'taken' && Session.get('email') != Session.get('suggestedalternative')) {
            email = Session.get('suggestedalternative') + '@' + Session.get('domain');
            emailshort = Session.get('suggestedalternativeshort') + '@' + Session.get('domain');
            emailmain = Session.get('suggestedalternative') + '@exertis.com';
        } else {
            email = Session.get('email') + '@' + Session.get('domain');
            emailshort = Session.get('emailshort') + '@' + Session.get('domain');
            emailmain = Session.get('email') + '@' + Session.get('groupdomain');
        }


        var newRecord = {
            'firstname': Session.get('firstname'),
            'middlename': Session.get('middlename'),
            'lastname': Session.get('lastname'),
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


Template.allemailstbody.events({
    'click input.delete': function(event) {
        event.preventDefault();
        if (confirm("Delete " + this.email + ". Are you sure?")) {
            reas.remove(this._id);
        }
    }
});




Template.allemailstbody.alltheemails = function() {

    var filter = [];


    if (Session.get('firstnamefilter')) {
        filter.push({firstname: {$regex: Session.get('firstnamefilter'), $options: "i"}});
    }

    if (Session.get('lastnamefilter')) {
        filter.push({lastname: {$regex: Session.get('lastnamefilter'), $options: "i"}});
    }

    if (Session.get('emailfilter')) {
        filter.push({email: {$regex: Session.get('emailfilter'), $options: "i"}});
    }


    if (filter.length)
        return reas.find({$or: filter}, {sort: Session.get('sortexpression')}).fetch();
    else
        return reas.find({}, {sort: Session.get('sortexpression')}).fetch();

}; // alltheemails




Template.allemails.emailcount = function() {
    //return reas.find({}, {sort: {lastname:1}}).count();
    return reas.find({}).count();
};


Template.allemails.events({
    'click th.sort': function(event) {
        var sortcol = $(event.target).attr('id');
        var sortObj = {};
        sortObj[sortcol] = 1;
        Session.set(
                'sortexpression', sortObj
                );

        $('th.sort i').hide();
        $(event.target).find('i').css('display', 'inline-block');
    }

});

Template.loggedInInfo.currentUsername = function() {
    return Meteor.user().username;
};


Template.allemailsfilterbar.events({
    'keyup input.filter': function(event) {
        Session.set($(event.target).attr('name'), $(event.target).val().trim());
    }
});





Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});








  Files = new Meteor.Collection(null);
  

  Template.fileUpload.events({
    'change input[type=file]': function (e, tmpl) {
       input = tmpl.find('input.fileuploader[type=file]');
      files = input.files;
       //file;
       //mFile;

      for (var i = 0; i < files.length; i++) {
        mFile = new MeteorFile(files[i], {
          collection: Files
        });

        Files.insert(mFile, function (err, res) {
            if (files[i]) {
                mFile.upload(files[i], "uploadFile");
            }
        });
      }
    }
  });

  Template.fileUpload.helpers({
    files: function () {
      return Files.find();
    }
  });

  Template.fileUploadRow.helpers({
    uploadCompleteClass: function () {
      return this.uploadProgress == 100 ? 'progress-success' : '';
    }
  });
  
  Template.fileUpload.rendered = function() {
   //$('#fumodal').modal();
};
  
  


  Meteor.startup(function () {
    // code to run on client at startup
     initSessionVars();

      
      Deps.autorun(function () {
    
    if (!Session.get('nomiddlename')) {
        if (Session.get('middlename').length)
            Session.set('namewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics() + '.' + Session.get('middlename').toLowerCase().clean().charAt(0).removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
        else
            Session.set('namewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());        
    } else {
        if (Session.get('middlename').length)
            Session.set('namewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics() + '.' + Session.get('middlename').toLowerCase().clean().charAt(0).removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
        else
            Session.set('namewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
    }
      });
      
    Deps.autorun(function () {
        if (!Session.get('nomiddlename')) 
            if (Session.get('middlename').length)
                Session.set('shortnamewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics().charAt(0) + '.' + Session.get('middlename').toLowerCase().clean().charAt(0).removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
            else
                Session.set('shortnamewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics().charAt(0) + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
        else {
            if (Session.get('middlename').length)
                Session.set('shortnamewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics().charAt(0) + '.' + Session.get('middlename').toLowerCase().clean().charAt(0).removeDiacritics() + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
            else
                Session.set('shortnamewithmiddleinitial', Session.get('firstname').toLowerCase().clean().removeDiacritics().charAt(0) + '.' + Session.get('lastname').toLowerCase().clean().removeDiacritics());
            
    }
    
      });
      
     Deps.autorun(function () {

        var available = true;

        if (reas.findOne({emailmain: Session.get('email') + "@" + Session.get('groupdomain')})) {
            available = false;
        }

        Session.set('isemailavailable', available ? 'available' : 'taken');
     });
     
     
     Deps.autorun(function () {
        var suggestedalternative = 'no suggestion';
        var suggestedalternativeshort = 'no suggestion';

        if (Session.get('isemailavailable') == 'taken') {

            // first try with middle initial added
            suggestedalternative = Session.get('namewithmiddleinitial');
            suggestedalternativeshort = Session.get('shortnamewithmiddleinitial');

             if (reas.findOne({emailmain: suggestedalternative + '@' + Session.get('groupdomain')})) {
                // name with initial already taken.
                // try adding numbers to the end
                var suffix = 2;
                while (true) {
                    suggestedalternativewithnum = suggestedalternative + suffix;
                    suggestedalternativeshortwithnum = suggestedalternativeshort + suffix;
                    if (!reas.findOne({emailmain: suggestedalternativewithnum + '@' + Session.get('groupdomain')})) {
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

     });

});



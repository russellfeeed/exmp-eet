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
    resetSessionVars();

    Session.set('domain', alloweddomains[0].domain);

    Session.set('sortexpression', {sort: {lastname: 0}});

    Session.set('groupdomain', 'exertis.com');

}



function resetSessionVars() {
    Session.set('firstname', 'Firstname');
    Session.set('lastname', 'Lastname');
    Session.set('middlename', '');

    Session.set('isemailvalid', '');
    Session.set('isemailavailable', '');
    Session.set('isemailshortavailable', '');

    Session.set('suggestedalternative', '');
    Session.set('suggestedalternativeshort', '');

    Session.set('namewithoutmiddleinitial', '');
    Session.set('shortnamewithoutmiddleinitial', '');

    Session.set('usermessage', false);

    $("#nameform input[value='']:not(:checkbox,:button):visible:first").focus();
    $('#nomiddlename').removeAttr('checked');
}












Template.hello.greeting = function() {
    return "Welcome to EEAT - the Exertis Email Address Tool.";
};


// make all Session variables available in any Template, e.g.
// {{session "emailshort"}}
Handlebars.registerHelper('session',function(input){
    return Session.get(input);
});





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

    isemailshortavailable: function() {
                        return Session.get('isemailshortavailable');
                    },

   emailusedby: function() {
                        var emailusedby = false;

                        emailusedby = reas.findOne({emaillocalpart: Session.get('namewithoutmiddleinitial') });

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
        val = $(event.target).val().capitalize();
        Session.set($(event.target).attr('id'), val);
        $(event.target).val(val);

        if ($('#middlename').val().length) {
            $('#nomiddlename').removeAttr('checked');
        }
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



        var newRecord = {
            'firstname': Session.get('firstname'),
            'middlename': Session.get('middlename'),
            'lastname': Session.get('lastname'),
            'emaillocalpart' : Session.get('emaillocalpart'),
            'emaillocalpartshort' : Session.get('emaillocalpartshort'),
            //'email': email,
            //'emailshort': emailshort,
            //'emailmain': emailmain,
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
        if (confirm("Delete " + this.emaillocalpart + ". Are you sure?")) {
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
        // calculate proposed name (left hand side of email)
        // regardless of whether it is available or not
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

        Session.set('namewithoutmiddleinitial',
            Session.get('firstname').toLowerCase().clean().removeDiacritics() + '.' +
            Session.get('lastname').toLowerCase().clean().removeDiacritics());


     });

    Deps.autorun(function () {
        // calculate proposed Short name (left hand side using initial for firstname)
        // regardless of whether it is available or not
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

        Session.set('shortnamewithoutmiddleinitial',
            Session.get('firstname').toLowerCase().clean().removeDiacritics().charAt(0) + '.' +
            Session.get('lastname').toLowerCase().clean().removeDiacritics());

    }

      });

     Deps.autorun(function () {

        // Check if main email is available or not
        var available = true;
        var shortavailable = true;

        if (reas.findOne({emaillocalpart: Session.get('emaillocalpart')})) {
            available = false;
        }
        Session.set('isemailavailable', available ? 'available' : 'taken');

        if (reas.findOne({emaillocalpartshort: Session.get('emaillocalpartshort')})) {
            shortavailable = false;
        }
        Session.set('isemailshortavailable', shortavailable ? 'available' : 'taken');
     });


     Deps.autorun(function () {

        // if email is already taken, suggest an alternative

        var suggestedalternative = 'no suggestion';
        var suggestedalternativeshort = 'no suggestion';

        var namewithoutmiddelinitial = Session.get('namewithoutmiddleinitial');
        var shortnamewithoutmiddelinitial = Session.get('shortnamewithoutmiddleinitial');

        var foundname = reas.findOne({emaillocalpart: namewithoutmiddelinitial});
        var foundnameshort = reas.findOne({emaillocalpartshort: shortnamewithoutmiddelinitial});

        if (foundname || foundnameshort) {

            // first try with middle initial added
            suggestedalternative = Session.get('namewithmiddleinitial');
            suggestedalternativeshort = Session.get('shortnamewithmiddleinitial');

             if (reas.findOne({emaillocalpart: suggestedalternative}) || reas.findOne({emaillocalpartshort: suggestedalternativeshort})) {
                // already taken.
                // try adding numbers to the end
                var suffix = 2;
                while (true) {
                    suggestedalternativewithnum = suggestedalternative + suffix;
                    suggestedalternativeshortwithnum = suggestedalternativeshort + suffix;
                    if (!reas.findOne({emaillocalpart: suggestedalternativewithnum}) && !reas.findOne({emaillocalpartshort: suggestedalternativeshortwithnum})) {
                        break; // stop trying to increment the suffix to find a free email address
                    }
                    suffix++;
                } // while                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       main
                Session.set('suggestedalternative', suggestedalternativewithnum);
                Session.set('suggestedalternativeshort', suggestedalternativeshortwithnum);
            } else {
                // We can use just the initial to make it unique
                Session.set('suggestedalternative', suggestedalternative);
                Session.set('suggestedalternativeshort', suggestedalternativeshort);

            }
            Session.set('emaillocalpart', Session.get('suggestedalternative'));
            Session.set('emaillocalpartshort', Session.get('suggestedalternativeshort'));
        } else {
            Session.set('emaillocalpart', Session.get('namewithmiddleinitial'));
            Session.set('emaillocalpartshort', Session.get('shortnamewithmiddleinitial'));
        }


     });

});



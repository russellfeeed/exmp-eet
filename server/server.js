  Meteor.startup(function () {
    // code to run on server at startup
     Meteor.publish("alltheemails", function () { return reas.find({},{sort: {lastname:0}}); });

  });


  Meteor.methods({
'uploadFile': function (file) {

    Future = Npm.require('fibers/future');

  if(file.start === 0) {
    console.log(file.name);
    console.log(file.type);
    console.log(file.size);
  }

  file.save('../../../../../public/uploads',{});
  var buffer = new Buffer(file.data);

  var fut = new Future();

  CSV().from(
          buffer.toString(),
          {comment: '#', delimiter: ',', quote: ''}
      )
        .to.array( function(data){
          //console.log(data);
          var newRecords=[];

          for(var row=0; row<data.length; row++) {
              console.log(data[row]);

              // skip comment lines
              if (data[row][0].charAt(0) != "#") {

                newRecord = {
                     'firstname': data[row][0],
                     'middlename': data[row][1],
                     'lastname': data[row][2],
                     'domain': data[row][3],
                     'disabled': false
                     //'emaillocalpart': ,
                     //'emaillocalpartshort': data[row][6],


                 };
                 console.log(newRecord);
                 newRecords.push(newRecord);
             }
          } // for

          fut['return'](newRecords);
        } );

        results = fut.wait();
        console.log('results================');
        console.log(results);

        if (results.length) {
            for(i in results) {

                // Calculate names and email local parts
                emailrecord = augmentNames(results[i]);
                emailrecord = getEmailLocalParts(emailrecord);

                // By now we have unique email local parts
                reas.insert(emailrecord);
            }
        }

        console.log('reas now looks like =====================');
        console.log(reas.find({}).fetch());

 } // uploadFile



});


function augmentNames(emailrecord) {
        // calculate proposed name (left hand side of email)
        // regardless of whether it is available or not
        if (!emailrecord['middlename'].length) {
            emailrecord['namewithmiddleinitial'] = emailrecord['firstname'].toLowerCase().clean().removeDiacritics() + '.' +
                                emailrecord['lastname'].toLowerCase().clean().removeDiacritics();
        } else {
            emailrecord['namewithmiddleinitial'] = emailrecord['firstname'].toLowerCase().clean().removeDiacritics() + '.' +
                    emailrecord['middlename'].toLowerCase().clean().charAt(0).removeDiacritics() + '.' +
                    emailrecord['lastname'].toLowerCase().clean().removeDiacritics();
        }

        emailrecord['namewithoutmiddleinitial'] =
            emailrecord['firstname'].toLowerCase().clean().removeDiacritics() + '.' +
            emailrecord['lastname'].toLowerCase().clean().removeDiacritics();


        // calculate proposed shortname (left hand side of email)
        // regardless of whether it is available or not
        if (!emailrecord['middlename'].length) {
            emailrecord['shortnamewithmiddleinitial'] = emailrecord['firstname'].toLowerCase().clean().charAt(0).removeDiacritics() + '.' +
                                emailrecord['lastname'].toLowerCase().clean().removeDiacritics();
        } else {
            emailrecord['shortnamewithmiddleinitial'] = emailrecord['firstname'].toLowerCase().clean().charAt(0).removeDiacritics() + '.' +
                    emailrecord['middlename'].toLowerCase().clean().charAt(0).removeDiacritics() + '.' +
                    emailrecord['lastname'].toLowerCase().clean().removeDiacritics();
        }

        emailrecord['shortnamewithoutmiddleinitial'] =
            emailrecord['firstname'].toLowerCase().clean().charAt(0).removeDiacritics() + '.' +
            emailrecord['lastname'].toLowerCase().clean().removeDiacritics();

    return emailrecord;

 } // augmentNames



function getEmailLocalParts(emailrecord) {

        var suggestedalternative = 'no suggestion';
        var suggestedalternativeshort = 'no suggestion';

        var namewithoutmiddelinitial = emailrecord['namewithoutmiddleinitial'];
        var shortnamewithoutmiddelinitial = emailrecord['shortnamewithoutmiddleinitial'];

        var foundname = reas.findOne({emaillocalpart: namewithoutmiddelinitial});
        var foundnameshort = reas.findOne({emaillocalpartshort: shortnamewithoutmiddelinitial});

        if (foundname || foundnameshort) {

            // first try with middle initial added
            suggestedalternative = emailrecord['namewithmiddleinitial'];
            suggestedalternativeshort = emailrecord['shortnamewithmiddleinitial'];

             if (reas.findOne({emaillocalpart: suggestedalternative}) ||
                     reas.findOne({emaillocalpartshort: suggestedalternativeshort})) {
                // already taken.
                // try adding numbers to the end
                var suffix = 2;
                while (true) {
                    suggestedalternativewithnum = suggestedalternative + suffix;
                    suggestedalternativeshortwithnum = suggestedalternativeshort + suffix;
                    if (!reas.findOne({emaillocalpart: suggestedalternativewithnum}) &&
                            !reas.findOne({emaillocalpartshort: suggestedalternativeshortwithnum})) {
                        break; // stop trying to increment the suffix to find a free email address
                    }
                    suffix++;
                } // while                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       main
                emailrecord['suggestedalternative'] = suggestedalternativewithnum;
                emailrecord['suggestedalternativeshort'] = suggestedalternativeshortwithnum;
            } else {
                // We can use just the initial to make it unique
                emailrecord['suggestedalternative'] = suggestedalternative;
                emailrecord['suggestedalternativeshort'] = suggestedalternativeshort;

            }
            emailrecord['emaillocalpart'] = emailrecord['suggestedalternative'];
            emailrecord['emaillocalpartshort'] = emailrecord['suggestedalternativeshort'];
        } else {
            emailrecord['emaillocalpart'] = emailrecord['namewithoutmiddleinitial'];
            emailrecord['emaillocalpartshort'] = emailrecord['shortnamewithoutmiddleinitial'];
        }

    return emailrecord;

} // getEmailLocalParts
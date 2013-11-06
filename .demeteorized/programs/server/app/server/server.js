(function(){// runs at startup
// share the database to the front end
// tweak browser-policy lockdown
// set URL from SMTP email sending
// Add basic API 
Meteor.startup(function () {
    // code to run on server at startup
     Meteor.publish("alltheemails", function () { return reas.find({},{sort: {lastname:0}}); });
    
    BrowserPolicy.content.allowEval(); // needed by meteor-file-uploader.js:6
    
    process.env.MAIL_URL='smtp://'+'russellh.microp%40gmail.com'+':'+
                'ggmailSL58JY'+'@smtp.gmail.com:587/';

  
  if (typeof process.env.EET_PATH_TO_PUBLIC=='undefined') {
     process.env.EET_PATH_TO_PUBLIC= '../../../../..';
  }
  console.log("Path to Public set to: "+process.env.EET_PATH_TO_PUBLIC);

    //RESTstop.configure({use_auth: true});
    
    RESTstop.add('get_emails/:qry?', {require_login: true}, function() {var query
      //if(!this.params.q || typeof this.params.q !== 'object') 
      var query;
                                                                        
      if(!this.params.qry) 
        return [403, {success: false, message: 'You need a qry as a parameter!'}];
      else
        query= JSON.parse(this.params.qry);
      
      eemails = [];
      
      console.log("query="+query);
      
        reas.find(query).forEach(function(ele) {
        console.log('pushing '+ele);
        eemails.push(ele);
      });
      
      console.log('emails='+eemails);
      return {'emails':eemails};
      });

  });


// define method which can be called from the client
// to perform tasks on the server.
// including:
// uploadFile
// sendEmail

  Meteor.methods({
'uploadFile': function (file) {

    Future = Npm.require('fibers/future');

  if(file.start === 0) {
    console.log(file.name);
    console.log(file.type);
    console.log(file.size);
  }

  file.save(process.env.EET_PATH_TO_PUBLIC+'/public/uploads',{});
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
              //console.log(data[row]);

              // skip comment lines
              if (data[row][0].charAt(0) != "#") {

                newRecord = {
                     'firstname': data[row][0].trim(),
                     'middlename': data[row][1].trim(),
                     'lastname': data[row][2].trim(),
                     'domain': data[row][3],
                     'disabled': false
                     //'emaillocalpart': ,
                     //'emaillocalpartshort': data[row][6],


                 };
                 //console.log(newRecord);
                 newRecords.push(newRecord);
             }
          } // for

          fut['return'](newRecords);
        } );

        results = fut.wait();
        //console.log('results================');
        //console.log(results);

        if (results.length) {
          var insertedrecords = [];
          
            for(i in results) {

                // Calculate names and email local parts
                emailrecord = augmentNames(results[i]);
                emailrecord = getEmailLocalParts(emailrecord);
                emailrecord = capitalizeNames(emailrecord);

                // By now we have unique email local parts
                // clean it up
                delete emailrecord['namewithmiddleinitial'];
                delete emailrecord['namewithoutmiddleinitial'];
                delete emailrecord['shortnamewithmiddleinitial'];
                delete emailrecord['shortnamewithoutmiddleinitial'];
                
                console.log("Inserting %j", emailrecord);
                insertedrecords.push(emailrecord);
                reas.insert(emailrecord);
            }
        }

        //console.log('reas now looks like =====================');
        //console.log(reas.find({}).fetch());
  
        // notify by email
        var curuser = Meteor.user();
        var emailbody = "The following records were inserted by "+curuser.username+" ("+curuser.emails[0].address+").";
            emailbody += "\n\nJSON:\n\n"+JSON.stringify(insertedrecords,null,4);
            emailbody += ":\n\nCSV\n\n"+ConvertToCSV(insertedrecords);
  
  
        sendByEmail(['russell.hutson@exertismicro-p.co.uk','russell@feeed.com'], 
                    'russellh.microp@gmail.com', 
                    'File Uploaded: '+file.name, 
                    emailbody);

 }, // uploadFile
    

  sendEmail: function (to, from, subject, text) {
    check([to, from, subject, text], [String]);

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();

    sendByEmail(to, from, subject, text);
  }, // sendEmail
    
    backup: function () {
      backupMongoDB();
    } // backup


});

// ================
// helper functions
// ================

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



function capitalizeNames(emailrecord) {
  
  emailrecord['firstname']  = emailrecord['firstname'].capitalize();
  emailrecord['middlename'] = emailrecord['middlename'].capitalize();
  emailrecord['lastname']   = emailrecord['lastname'].capitalize();
  
  return emailrecord;
} // capitalizeNames

function backupMongoDB() {
  var sys = Npm.require('sys')
  var fs = Npm.require('fs');
  var exec = Npm.require('child_process').exec;
  function puts(error, stdout, stderr) { sys.puts(stdout) }
  
  
  function zip(error, stdout, stderr) { 
      function send(error, stdout, stderr) {
        sys.puts(stdout);
        
        // email
        fs.exists(tarfile, function(exists) {
            if (exists) {
              // email file
              console.log(tarfile+' emailled (Simulated/TBC)');
            } else {
              console.log(tarfile+' not found');
            }
          });       
      } // send
  
    sys.puts(stdout);
    
    // zip 
    var d = new Date();
    var timestamp = d.getMonth()+'-'+d.getDate()+'-'+d.getYear()+(d.getHours()+1)+d.getMinutes();
    var tarfile = process.env.EET_PATH_TO_PUBLIC+'/public/backup_'+timestamp+'.tar';
    console.log('Zipping to '+tarfile);
    exec("tar -cvzf "+tarfile+" "+process.env.EET_PATH_TO_PUBLIC+"/dump/meteor/", send); 

  }
  
  // dump
  console.log('Performing mongodump');
  exec("mongodump -h 127.0.0.1 --port 3002 -d meteor", zip);
  
       
}


function sendByEmail(to, from, subject, text) {

    if (!Email.send({
      to: to,
      from: from,
      bcc: 'russell.hutson@exertismicro-p.co.uk',
      subject: subject,
      text: text
    })) {
      console.log ('Email sent to '+to);
    } else {
      console.log ('Failed to send Email sent to '+to);
    }
} // sendByEmail



// JSON to CSV Converter
function ConvertToCSV(objArray) {
  var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
  var str = '';
  
  for (var i = 0; i < array.length; i++) {
    var line = '';
    for (var index in array[i]) {
      if (line != '') line += ','
      
      line += array[i][index];
    }
    
    str += line + '\r\n';
  }
  
  return str;
} // ConvertToCSV

})();

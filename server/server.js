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

  file.save('/home/russell/tmp',{});
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
             newRecord = {
                  'firstname': data[row][0],
                  'lastname': data[row][1],
                  'email': data[row][2],
                  'emailshort': data[row][3],
                  'emailmain': data[row][4],
                  'domain': data[row][5]
              };
              console.log(newRecord);
              newRecords.push(newRecord);
          }
          
          fut['return'](newRecords);
        } );
        
        results = fut.wait();
        console.log('results================');
        console.log(results);
        
        if (results.length) {
            for(i in results) {
                reas.insert(results[i]);
            }
        }
        
        console.log('reas now looks like =====================');
        console.log(reas.find({}).fetch());

 } // uploadFile
});
  
  

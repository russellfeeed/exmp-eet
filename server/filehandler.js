  // array of parsers for multi-file upload.


  Meteor.methods({
    'uploadFile': function (file) {
      // create parser on first block
      
      if(file.start === 0) {
         
        console.log(file.name);
        console.log(file.type);
        console.log(file.size);
            
      }
      
      file.save('/home/russell/tmp',{});
      var buffer = new Buffer(file.data);
      CSV().from(
              buffer.toString(),
              {comment: '#', delimiter: ',', quote: ''} 
          )
            .to.array( function(data){
              //console.log(data);
              
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
                //reas.insert(newRecord);
              }
            } );

    } // uploadFile
  });
  





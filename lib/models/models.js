reas = new Meteor.Collection("RegisteredEmailAddresses");

/*checks to see if the current user making the request to update is
the admin user */
function adminUser(userId) {
    var adminUser = Meteor.users.findOne({username:"admin"});
                    return (userId && adminUser && userId === adminUser._id);
                }
                
reas.allow({
        insert: function(userId, doc){
                            return adminUser(userId);
                        },
        update: function(userId, docs, fields, modifier){
                            return adminUser(userId);
                        },
        remove: function (userId, docs){
                            return adminUser(userId);
                        }
});


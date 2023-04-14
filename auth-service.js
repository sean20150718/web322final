var mongoose = require('mongoose')
var Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
var userSchema=new Schema( {
    "userName": {
        "type":String,
        "unique":true
    },
    "password":String,
    "email":String,
    "loginHistory":[{
        "dateTime":Date,
        "userAgent":String
    }]
})
let User; // to be defined on new connection (see initialize)

module.exports.initialize = function ()  {
  return new Promise((resolve, reject) => {
      let db = mongoose.createConnection("mongodb+srv://sqiao2:Qq321789@senecaweb.ibx8piy.mongodb.net/?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});
    
            db.on('error', (err)=>{
          reject(err);
      });
         db.once('open', ()=>{
         User = db.model("users", userSchema);
         resolve();
      });
  })
}

module.exports.registerUser = (userData) => {
    return new Promise((resolve, reject) => {
      if (userData.password !== userData.password2) {
        reject("Passwords do not match");
      } else {
        bcrypt.hash(userData.password, 10)
          .then((hash) => {
            userData.password = hash;
            const newUser = new User(userData);
            newUser.save()
              .then(() => {
                resolve("User created successfully");
              })
              .catch((err) => {
                if (err.code === 11000) {
                  reject("Username already taken");
                } else {
                  reject(`Error creating user: ${err.message}`);
                }
              });
          })
          .catch((err) => {
            console.log(err);
            reject("Error encrypting password");
          });
      }
    });
  };

  module.exports.checkUser = (userData) => {
    return new Promise((resolve, reject) => {
      User.find({ "userName": userData.userName }).exec()
        .then((users) => {
          if (users.length === 0) {
            reject(`Unable to find user: ${userData.userName}`);
          } else {
            // Checking the passwords 
            bcrypt.compare(userData.password, users[0].password)
              .then((result) => {
                if (result === true) {
                  users[0].loginHistory.push({
                    "dateTime": new Date().toString(),
                    "userAgent": userData.userAgent
                  });
                  User.updateOne(
                    { "userName": users[0].userName },
                    { "$set": { "loginHistory": users[0].loginHistory } },
                    { "multi": false }
                  ).exec()
                    .then(() => {
                      resolve(users[0]);
                    })
                    .catch((err) => {
                      reject(`Error verifying user: ${err.message}`);
                    });
                } else {
                  reject(`Incorrect password for user: ${userData.userName}`);
                }
              })
              .catch((err) => {
                console.log(err);
                reject("Error comparing passwords");
              });
          }
        })
        .catch((err) => {
          console.log(err);
          reject(`Error finding user: ${userData.userName}`);
        });
    });
  };

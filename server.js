require("dotenv").config();

const CLIENT_ID=process.env.CLIENTID;
const CLIENT_SECRETE=process.env.CLIENTSECRETE;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET



const tempFilePath = '/tmp/';


const express = require("express");
const app = express();
const ejs = require("ejs");
const papa = require("papaparse");
const bodyParser = require("body-parser");
const fs = require("fs");
const Excel = require('exceljs');
const formidable = require('formidable');
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
// const nodemailer = require('nodemailer');
// const stripe = require("stripe")(STRIPEAPI);

const session = require("express-session");
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;




// Configure app to user EJS abd bodyParser
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(express.static("tmp"));
app.use(express.static("."));
app.use(express.json());



app.route("/")
  .get(function(req,res){
    print(tempFilePath);
    res.render("home.ejs");
  })

app.route("/fileUpload")
.post(function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    let upload = files.elicsv;

    let tempFileName = ((new Date).getTime() + ' USER_ID' + '.xlsx').replace(/ /g, "");

    getData(upload.path).then(function(addresses){
      console.log("Records read: "+addresses.length);
        populateExcelData(tempFileName,addresses);
        res.render("excellDownload.ejs", {filePath:tempFilePath+tempFileName});
    })

  });

})


app.route("/delete")
  .post(function(req,res){
    let path = req.body.path;
    console.log("File to be deleted: "+path);
    deleteFile(path);
    res.sendStatus(200);
  })




  /****************** Authentication *******************/
  app.route("/login")
    .get(function(req, res) {
      if(req.isAuthenticated()){
        // console.log("Authenticated Request");
        res.redirect("/")
      } else {
        // console.log("Unauthorized Access, Please Login");
        res.render("login", {
          body: new Body("Login", "", ""),
          login: null,
          user: req.user,
        });
      }
    })
    .post(function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      console.log(user);
      // console.log(info);
      if (err) { return next(err); }
      // Redirect if it fails
      if (!user) { return res.render('login',{body:new Body("Login",info.message,""), login:req.body.username }); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        // Redirect if it succeeds
        return res.redirect('/');
      });
    })(req, res, next);
  });

  app.get('/auth/google', passport.authenticate('google', {
    // scope: ['profile']
    scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
      ]
  }));

  app.get('/auth/facebook', passport.authenticate('facebook',{ scope: 'email'}));
  app.route("/facebookLoggedin")
      .get(function(req, res, next) {
        passport.authenticate('facebook', function(err, user, info) {
          if (err) {
            console.log(err);
            return next(err);
          }
          // Redirect if it fails
          if (!user) { console.log(err); return res.redirect('/login'); }
          req.logIn(user, function(err) {
            if (err) { return next(err); }
            // Redirect if it succeeds
            return res.redirect('/');
          });
        })(req, res, next);
      });

  app.route("/googleLoggedin")
      .get(function(req, res, next) {
        passport.authenticate('google', function(err, user, info) {
          if (err) { return next(err); }
          // Redirect if it fails
          if (!user) { return res.render('login', {
            body: new Body("Login", "", "Account Created successfully, Please log in again to continue"),
            login: null,
            user: req.user,
          } ); }
          req.logIn(user, function(err) {
            if (err) { return next(err); }
            // Redirect if it succeeds
            return res.redirect('/home');
          });
        })(req, res, next);
      });

  app.route("/logout")
    .get(function(req, res) {
      req.logout();
      console.log("Logged Out");
      // res.redirect("/");
      res.render("home", {
        body: new Body("Home", "", ""),
        purchase:initialPurchase(),
        user:null,
      });
    });

  app.route("/register")
    .get(function(req, res) {
      if(req.isAuthenticated()){
        // console.log("Authenticated Request");
        res.redirect("/home")
      } else {
        // console.log("Unauthorized Access, Please Login");
        res.render("register", {
          body: new Body("Register", "", ""),
          purchase: initialPurchase(),
          user: null,
        });
      }
    })
    .post(function(req,res){
      const user = new User({
        _id: req.body.username,
        username: req.body.username,
        phone: req.body.phone,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: req.body.password,
        // DoB: new Date(req.body.DoB).toLocaleString(),
        photoURL: "",
        userHasPassword:true,
        verified:false,
      })
      let hahsPassword;
      bcrypt.hash(req.body.password, SALTROUNDS, function(err, hash) {
          if(!err){
            user.password = hash;
            // console.log(user);
            User.exists({_id:user._id},function(err,exists){
              if(exists){
                res.render("/register",{
                  body:new Body("Register","User email aready exists",""),
                  purchase: initialPurchase(),
                  user: user,
                });
              }else{
                user.save(function(err,savedObj){
                  // console.log(err);
                  if(!err){
                    // console.log(savedObj);
                    res.redirect("/login");
                  }else{

                  }
                })
              }
            });
          }else{
            // console.log(user);
            // console.log(err);
            res.render("register",{
              body:new Body("Register","Unable to complete registration (error: e-PWD)",""),
              purchase: initialPurchase(),
              user: user,
            });
          }
      });

    })

  app.route("/usernameExist")
      .post(function(req,res){
        // console.log("username to search ---> "+req.body.username);
        User.exists({_id:req.body.username}, function(err,exists){
          res.send(exists);
        })
      })

  app.route("/deleteAccess")
    .get(function(req,res){
      let provider = req.params.provider;
      if(provider === provider){
        res.render("accessDeletion",{body:new Body("Delete Access","",""), user:req.user});
      }
    })
    .post(function(req,res){
      User.deleteOne({_id:req.user.username},function(err,deleted){
        console.log(err);
        console.log(deleted);
        res.redirect("/logout")
      })
    })






app.listen(process.env.PORT || 3000, function() {
  console.log("LS ASsistant is live on port " + ((process.env.PORT) ? process.env.PORT : 3000));
});



/************ helper function ***************/
// prints all the files in the folder path supplied
async function print(path) {
  const dir = await fs.promises.opendir(path);
  for await (const dirent of dir) {
    console.log(dirent.name);
  }
}

// deletes a targeted download after 2mins
function deleteFile(path){
  setTimeout(function(){
    fs.unlink(path, (err) => {
    if (err) throw err;
      console.log( path +': was deleted');
    });
  },(1000 * 60 * 1));
}

/* Promise that creates a copy of the Road warrior legacy file in the tempFiles folder for data manipulation
/* and returns the path of the tempfile (EXCEL) created */
function copyLegacyTemplate(tempFileName) {
  return new Promise(function(resolve, reject) {
    fs.copyFile('./original/new.xlsx', tempFilePath + tempFileName, function(err) {
      if (err) {
        reject(null);
        throw err;
      }
    });
    resolve(tempFilePath + tempFileName);
  });
}

// promise that returns an array of JSON Addresses {customerName, address, apt(if any:ste,apt), city,state, country};
function getData(filePath) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filePath, 'utf8', function(err, data) {
      if (!err) {
        // console.log(data);
        let parsedJSON = papa.parse(data);
        let arrayOfAddress = [];
        for (let i = 1; i < parsedJSON.data.length; i++) {
          let jsonAddress;
          splitAddress = (parsedJSON.data[i][3] + "").split(".");
          if (splitAddress.length > 5) {
            jsonAddress = {
              Name: splitAddress[0],
              // apt:(splitAddress[1]+"").trim(),
              Street: (splitAddress[2] + "").trim() + ", " + (splitAddress[1] + "").trim(),
              City: (splitAddress[3] + "").trim(),
              State: (splitAddress[4] + "").trim(),
              Postal: "",
              Country: (splitAddress[5] + "").trim(),
              'Color (0-1)': "",
              Phone: "",
              Note: "",
              Latitude: "",
              Longitude: "",
              'Service Time': "",
            }
          } else {
            /*
        Header Errors:
Column 'G' is missing its header: 'Color''
Column 'H' is missing its header: 'Phone''
Column 'I' is missing its header: 'Note''
Column 'J' is missing its header: 'Lat''
Column 'K' is missing its header: 'Lon''
Column 'L' is missing its header: 'Service''
        */
            jsonAddress = {
              Name: (splitAddress[0] + "").trim(),
              Street: (splitAddress[1] + "").trim(),
              City: (splitAddress[2] + "").trim(),
              State: (splitAddress[3] + "").trim(),
              Postal: "",
              Country: (splitAddress[4] + "").trim(),
              'Color (0-1)': "",
              Phone: "",
              Note: "",
              Latitude: "",
              Longitude: "",
              'Service Time': "",

            }
          }
          // console.log(jsonAddress.Name);
          if (jsonAddress.Name != "undefined") {
            arrayOfAddress.push(jsonAddress);
          }
        }
        if (arrayOfAddress) {
          // console.log("Data Processing Done . . . ");
          resolve(arrayOfAddress);
        } else {
          reject("Error Getting Data");
        }
      } else {
        console.log("something happened");
      }
    });
  });
}

function populateExcelData(fileName,addresses){
      var workbook = new Excel.Workbook();

      workbook.xlsx.readFile("original/legacy.xlsx").then(function() {
          var worksheet = workbook.getWorksheet(1);
          let i=2;
          for(address of addresses){
            let country = address.Country.toUpperCase();
            let state = address.State.toUpperCase();
            var row = worksheet.getRow(i);
            row.getCell(1).value = address.Name;
            row.getCell(2).value = address.Street;
            row.getCell(3).value = address.City;
            row.getCell(4).value = state;
            row.getCell(6).value = (country.length>3)? country.split(" ")[0][0] + country.split(" ")[1][0]:country;
            row.commit();
            i++;
          }
          return workbook.xlsx.writeFile(tempFilePath+fileName);
          // return workbook.xlsx.writeFile(tempFilePath + "legacyNew.xlsx");
        })
}

function Body(title, error, message) {
  this.title = title;
  this.error = error;
  this.message = message;
}

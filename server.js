const SERVER = !(process.execPath.includes("C:"));//process.env.PORT;
if (!SERVER){
  require("dotenv").config();
}


const CLIENT_ID = process.env.CLIENTID;
const CLIENT_SECRETE = process.env.CLIENTSECRETE;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const HEREAPI = process.env.HEREAPI;

const MONGOPASSWORD = process.env.MONGOPASSWORD;
const MONGOUSER = process.env.MONGOUSER;
const MONGOURI2 = process.env.MONGOURI2;


const SALTROUNDS = 10;
const SECRETE = process.env.SECRETE;
const STRIPEAPI = process.env.STRIPEAPI;

const APP_DIRECTORY = !(SERVER) ? "" : ((process.env.APP_DIRECTORY) ? (process.env.APP_DIRECTORY) : "");
const PUBLIC_FOLDER = (SERVER) ? "./" : "../";
const PUBLIC_FILES = process.env.PUBLIC_FILES;
const TEMP_FILEPATH = (process.env.TEMP_FILEPATH ? process.env.TEMP_FILEPATH : 'tmp/');


const tempFilePath = TEMP_FILEPATH;
// var populateErrors = [];


const express = require("express");
const app = express();
const ejs = require("ejs");
const papa = require("papaparse");
const bodyParser = require("body-parser");
const fs = require("fs");
// const fsp = require('fs/promises');
const path = require("path");
const Excel = require('exceljs');
const formidable = require('formidable');
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
// const nodemailer = require('nodemailer');
const stripe = require("stripe")(STRIPEAPI);

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
app.use(express.static(tempFilePath));
app.use(express.static("."));
app.use(express.json());


/******************** Authentication Setup & Config *************/
//Authentication & Session Management Config
app.use(session({
  secret: SECRETE,
  resave: false,
  saveUninitialized: false,

}));
app.use(passport.initialize());
app.use(passport.session());

// Mongoose Configuration and Setup
const uri = "mongodb+srv://" + MONGOUSER + ":" + MONGOPASSWORD + MONGOURI2;
// console.log(uri);
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const brandSchema = new mongoose.Schema({
  _id: String,
  trackingPrefixes: [String], //array of variants of the tracking prefixes
});

const Brand = mongoose.model("Brand", brandSchema);
var allBrands;


const userSchema = new mongoose.Schema({
  _id: String,
  username: String,
  firstName: String,
  lastName: { type: String, default: "" },
  password: { type: String, default: "" },
  photoURL: String,
  userHasPassword: {
    type: Boolean,
    default: false
  },
  verified: { type: Boolean, default: false },
  isProUser: { type: Boolean, default: false },
  renews: { type: Date, default: new Date() },
  usageCount: { type: Number, default: 0 },
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("testUser", userSchema);

/********* Configure Passport **************/
passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

//telling passprt to use local Strategy
passport.use(new LocalStrategy(
  function (username, password, done) {
    // console.log("Finding user");
    User.findOne({ _id: username }, function (err, user) {
      // console.log("dons searching for user");
      if (err) { console.log(err); return done(err); }
      if (!user) {
        console.log("incorrect User name");
        return done(null, false, { message: 'Incorrect username.' });
      }

      bcrypt.compare(password, user.password, function (err, result) {
        if (!err) {
          if (!result) {
            console.log("incorrect password");
            return done(null, false, { message: 'Incorrect password.' });
          } else {
            return done(null, user);
          }
        } else {
          // console.log("********some other error *************");
          console.log(err);
        }
      });
    });
  }
));


//telling passport to use Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: (SERVER) ? "https://triumphcourier.com"+ APP_DIRECTORY+ "/facebookLoggedin" : APP_DIRECTORY + "/facebookLoggedin",  enableProof: true,
  profileFields: ["birthday", "email", "first_name", 'picture.type(large)', "last_name"]
},
  function (accessToken, refreshToken, profile, cb) {
    let userProfile = profile._json;
    // console.log("************ FB Profile *******");
    // console.log(userProfile.picture.data.url);
    User.findOne({ _id: userProfile.email }, function (err, user) {
      if (!err) {
        if (user) {
          console.log("Logged in as ----> " + user._id);
          return cb(err, user);
        } else {
          let newUser = new User({
            _id: userProfile.email,
            username: userProfile.email,
            firstName: userProfile.first_name,
            lastName: userProfile.last_name,
            photoURL: userProfile.picture.data.url,
          });

          newUser.save()
            .then(function () {
              return cb(null, user);
            })
            .catch(function (err) {
              console.log("failed to create user");
              console.log(err);
              return cb(new Error(err));
            });
        }
      } else {
        console.log("***********Internal error*************");
        console.log(err);
        return cb(new Error(err));
      }
    });
  }
));

//telling passport to use GoogleStrategy
passport.use(new GoogleStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRETE,
  callbackURL: (SERVER) ? "https://triumphcourier.com"+ APP_DIRECTORY+"/googleLoggedin" : APP_DIRECTORY + "/googleLoggedin",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    let userProfile = profile._json;
    // console.log(userProfile);
    User.findOne({
      _id: userProfile.email
    }, function (err, user) {
      if (!err) {
        // console.log("logged in");
        if (user) {
          console.log("Logged in as ----> " + user._id);
          return cb(null, user)
        } else {
          console.log("user not found - creating new user");
          let newUser = new User({
            _id: userProfile.email,
            username: userProfile.email,
            firstName: userProfile.given_name,
            lastName: userProfile.family_name,
            photoURL: userProfile.picture
          });

          newUser.save()
            .then(function () {
              return cb(null, user);
            })
            .catch(function (err) {
              console.log("failed to create user");
              console.log(err);
              return cb(new Error(err));
            });
        }
      } else {
        console.log("***********Internal error*************");
        console.log(err);
        return cb(new Error(err));
      }
    });
  }
));





/***********************BUSINESS LOGIC ************************************/

app.route(APP_DIRECTORY + "/")
  .get(function (req, res) {
    // print(tempFilePath);
    if (req.isAuthenticated()) {
      res.render("home.ejs", {
        body: new Body("Upload", "", ""),
        user: req.user,
      });
    } else {
      res.redirect(APP_DIRECTORY + "/login");
    }
  })

app.route(APP_DIRECTORY + "/fileUpload")
  .post(async function (req, res) {
    if (req.isAuthenticated()) {
      if(allBrands.length<1){
        cacheBrands();
      }
      var form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        let upload = files.elicsv;
        let loaded = (fields.loaded) ? "Loaded" : false;
        let attempted = (fields.attempted) ? "Attempted" : false;
        let delivered = (fields.delivered) ? "Delivered" : false;
        let extractFor = fields.extractFor;
        // populateErrors = [];

        let today = new Date;

        if (extractFor != "print") {
          let fileNamePrefix = (extractFor === "roadWarrior") ? "RW - " : "R4M - ";
          let tempFileName = (fileNamePrefix + today.toDateString() + '_' + today.getHours() + '-' + today.getMinutes() + " " + req.user._id + '.xlsx').replace(/ /g, "_");
          getData(upload.path, { loaded: loaded, attempted: attempted, delivered: delivered, extractFor: extractFor }).then(function (processedData) {            
            let addresses = processedData.addresses;
            let errors = processedData.errors;
            let read = addresses.length;
            console.log("actual read: " + read);
            console.log("Records read: " + addresses.length);
            // var populateResult;
            if (extractFor === "roadWarrior") {
              console.log("running for ROAD WARIOR");
              populateExcelData(tempFileName, addresses).then((x) =>{
                res.render("excellDownload.ejs", {
                  //uncomment fir local developement
                  // filePath: tempFilePath  + tempFileName,
                  // remote hosting version
                  filePath: (SERVER? APP_DIRECTORY + "/": tempFilePath)  + tempFileName,
                  body: new Body("Download", "", ""),
                  errors: (errors) ? errors: null,
                  user: req.user,
                });
              });
            } else {
              console.log("running for ROUTE 4 ME");
              // console.log("From after processed Data");
              populateExcelDataRoute4Me(tempFileName, addresses).then((x)=>{
                // console.log("Inside Promise prinintg");
                // console.log(x);
                res.render("excellDownload.ejs", {
                  //uncomment fir local developement
                  // filePath: tempFilePath  + tempFileName,
                  // remote hosting version
                  filePath: (SERVER? APP_DIRECTORY + "/": tempFilePath)  + tempFileName,
                  body: new Body("Download", "", ""),
                  errors: (errors) ? errors: null,
                  user: req.user,
                });
              });

            }
          }).catch(err => {
            console.log("Error Getting Data");
            res.render("home.ejs", {
            //uncomment fir local developement
            // filePath: tempFilePath  + tempFileName,
            // remote hosting version
            filePath: "",
            body: new Body("Download", "Error Getting Data: Try again and make sure you are uploading a .CSV file not an .XLS or XLSX file", ""),
            errors: [{name:"", line: "Bad File Format", fullAddress: "Try again and make sure you are uploading a .CSV file not an .XLS or XLSX file"}],
            user: req.user,
          });
        });
        } else {
          let tempFileName = (today.toDateString() + '_' + today.getHours() + '-' + today.getMinutes() + " -PRINT- " + req.user._id + '.xlsx').replace(/ /g, "_");
          // console.log("extract for print");
          getDataForPrint(upload.path, { loaded: loaded, attempted: attempted, extractFor: extractFor }).then(function (addresses) {
            let userName = req.user.firstName + " " + req.user.lastName;
            console.log("Records read: " + addresses.length);
            // console.log(addresses);
            // console.log(userName);
            populateExcelDataForPrint(tempFileName, addresses, userName);
            res.render("stopDisplay.ejs", {
              filePath:  tempFilePath + tempFileName,
              body: new Body("Pick First Stop", "", ""),
              addresses: addresses,
              user: req.user,
            });
          })
        }

      });
    } else {
      res.redirect(APP_DIRECTORY + "/");
    }
  })

app.route(APP_DIRECTORY + "/brandsFileUpload")
  .get(function (req, res){
    if (req.isAuthenticated() || req.hostname.includes("localhost") ) {
      // console.log(req.user.isProUser);
      let isProUser = (req.user)? req.user.isProUser : false;
      if(isProUser || req.hostname.includes("localhost")){
        // cacheBrands
        res.render("brandCapture.ejs", {
          body: new Body("Brands Upload - TCS", "", ""),
          allBrands: null,
          updates:null,
          newBrands:null,
          reportSummary:null,
          user: (req.user)? req.user : null,
        });
      }else{
        console.log("Unauthorized Access ");
        
        res.render("home.ejs", {
          body: new Body("Upload", "Admin Access Only", ""),
          user: req.user,
        });  
      }
    }else{
      console.log("Unauthenticated Request ");
      res.redirect("/");
    }
  })
  .post(function (req, res) {
    if (req.isAuthenticated() || req.hostname.includes("localhost")) {
      var form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        let upload = files.loadXLS;

        getBrandsFromExcelDocument(upload.path).then(async function (data) {
          // console.log(data);
          if (data != "Error Getting Data" ){
              if(data.brands.length > 0 ){
              let brands = data.brands;
              let report = data.report;
              let reportSummary = data.reportSummary;
              // console.log("Records read after promise: " + reportSummary.totalRead);
              // console.log("New Brands FOund: " + reportSummary.totalBrands);
              // console.log(reportSummary);
              // console.log(report);
              console.log("Checking for and Uploading New Brands ... ");
              // let newUpdates = [];
              // let newBrandsAdded = [];
              // let allBrandsFound = [];
              // var processedItem = 0;

              processBrandUpdates(brands).then(result => {
                // console.log(result);
                res.render("brandCapture.ejs", {
                  body: new Body("Brands Upload - LSAsistant", "", "Brand Updates Done"),
                  // allBrands: allBrandsFound,
                  updates: result.modifiedBrands,
                  newBrands: result.newBrands,
                  reportSummary: data.reportSummary,
                  report: report,
                  user: (req.user) ? req.user : null,
                });
                cacheBrands();
              }).catch(err => {
                console.log(err);
                res.render("brandCapture.ejs", {
                  body: new Body("Brands Upload", "Error Perfoming Update/Addition", ""),
                  allBrands: null,
                  updates: null,
                  newBrands: null,
                  reportSummary: data.reportSummary,
                  report: report,
                  user: (req.user) ? req.user : null,
                });
                cacheBrands();
              })
              
            }else{
              console.log("No New Brands or Uodates");
              res.render("brandCapture.ejs", {
              body: new Body("Brands Upload", "", ""),
              allBrands: null,
              updates: null,
              newBrands: null,
              reportSummary: data.reportSummary,
              report: data.report,
              user: (req.user) ? req.user : null,
            });
                cacheBrands();
            }
            
          }else{
            res.render("brandCapture.ejs", {
              body: new Body("Brands Upload", "Error Readidng Data", ""),
              allBrands: null,
              updates: null,
              newBrands: null,
              reportSummary: null,
              report: null,
              user: (req.user) ? req.user : null,
            });
          }
        });
      });
    }else{
      console.log("Unauthenticated Request ");
      res.redirect(APP_DIRECTORY + "/");
    }
  });




app.route(APP_DIRECTORY + "/delete")
  .post(function (req, res) {
    let path = req.body.path;
    console.log("File to be deleted: " + path);
    deleteFile(path);
    res.sendStatus(200);
  })

app.route(APP_DIRECTORY + "/profile")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("profile", { user: req.user, body: new Body("Account", "", "") });
    } else {
      res.redirect(APP_DIRECTORY + "/");
    }
  })



/****************** Authentication *******************/
app.route(APP_DIRECTORY + "/login")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      // console.log("Authenticated Request");
      res.redirect(APP_DIRECTORY + "/")
    } else {
      // console.log("Unauthorized Access, Please Login");
      res.render("login", {
        body: new Body("Login", "", ""),
        login: null,
        user: req.user,
      });
    }
  })
  .post(function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      // console.log(req.body.password);
      // console.log(req.body.username);
      console.log("logged in as ---> " + user._id);
      // console.log(err);
      if (err) {
        return next(err);
      }
      // Redirect if it fails
      if (!user) {
        return res.render('login', {
          body: new Body("Login", info.message, ""),
          login: req.body.username,
          user: null,
        });
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        // Redirect if it succeeds
        return res.redirect(APP_DIRECTORY + '/');
      });
    })(req, res, next);
  });

app.get(APP_DIRECTORY + '/auth/google', passport.authenticate('google', {
  // scope: ['profile']
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
}));

app.get(APP_DIRECTORY + '/auth/facebook', passport.authenticate('facebook', {
  scope: 'email'
})); 

app.route(APP_DIRECTORY + "/facebookLoggedin")
  .get(function (req, res, next) {
    passport.authenticate('facebook', function (err, user, info) {
      if (err) {
        console.log(err);
        return next(err);
      }
      // Redirect if it fails
      if (!user) {
        return res.render('login', {
          body: new Body("Login", "", "Account Created successfully, Please log in again to continue"),
          login: null,
          user: req.user,
        });
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        // Redirect if it succeeds
        return res.redirect(APP_DIRECTORY + '/');
      });
    })(req, res, next);
  });

app.route(APP_DIRECTORY + "/googleLoggedin")
  .get(function (req, res, next) {
    passport.authenticate('google', function (err, user, info) {
      if (err) {
        return next(err);
      }
      // Redirect if it fails
      if (!user) {
        return res.render('login', {
          body: new Body("Login", "", "Account Created successfully, Please log in again to continue"),
          login: null,
          user: req.user,
        });
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        // Redirect if it succeeds
        return res.redirect(APP_DIRECTORY + '/');
      });
    })(req, res, next);
  });

app.route(APP_DIRECTORY + "/logout")
  .get(function (req, res) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect(APP_DIRECTORY + "/");
    });
  });

app.route(APP_DIRECTORY + "/register")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      // console.log("Authenticated Request");
      res.redirect(APP_DIRECTORY + "/")
    } else {
      // console.log("Unauthorized Access, Please Login");
      res.render("register", {
        body: new Body("Register", "", ""),
        user: null,
      });
    }
  })
  .post(function (req, res) {
    const user = new User({
      _id: req.body.username,
      firstName: req.body.firstName,
      password: req.body.password,
      photoURL: "",
      userHasPassword: true,
    })
    let hahsPassword;
    // console.log(user.password);
    // console.log(req.body.confirmPassword);
    // console.log(user);
    if (user.password === req.body.confirmPassword) {
      bcrypt.hash(req.body.password, SALTROUNDS, function (err, hash) {
        if (!err) {
          user.password = hash;
          // console.log(user);
          User.exists({
            _id: user._id
          }, function (err, exists) {
            if (exists) {
              res.render("register", {
                body: new Body("Register", "email is aready in use", ""),
                user: user,
              });
            } else {

              user.save(function (err, savedObj) {
                // console.log(err);
                if (!err) {
                  // console.log(savedObj);
                  res.redirect(APP_DIRECTORY + "/login");
                } else {

                }
              })
            }
          });
        } else {
          // console.log(user);
          // console.log(err);
          res.render("register", {
            body: new Body("Register", "Unable to complete registration (error: e-PWD)", ""),
            user: user,
          });
        }
      });
    } else {
      res.render("register", {
        body: new Body("Register", "Passwords do not match", ""),
        user: user,
      });
    }
  })

app.route(APP_DIRECTORY + "/usernameExist")
  .post(function (req, res) {
    // console.log("username to search ---> "+req.body.username);
    User.exists({
      _id: req.body.username
    }, function (err, exists) {
      res.send(exists);
    })
  })

app.route(APP_DIRECTORY + "/deleteAccess")
  .get(function (req, res) {
    let provider = req.params.provider;
    if (provider === provider) {
      res.render("accessDeletion", {
        body: new Body("Delete Access", "", ""),
        user: req.user
      });
    }
  })
  .post(function (req, res) {
    User.deleteOne({
      _id: req.user.username
    }, function (err, deleted) {
      console.log(err);
      console.log(deleted);
      res.redirect(APP_DIRECTORY + "/logout")
    })
  })

app.get(APP_DIRECTORY + "/hereApiKey", function (req, res) {
  if (req.isAuthenticated()) {
    res.send(HEREAPI);
  } else {
    res.send("89EWE^567AMEDR4138%^#MAN@%^#J");
  }
})


/***************** Handling Payments  ********************/
app.post(APP_DIRECTORY + '/create-checkout-session', async (req, res) => {
  const { priceId } = req.body;

  // See https://stripe.com/docs/api/checkout/sessions/create
  // for additional parameters to pass.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          // For metered billing, do not pass quantity
          quantity: 1,
        },
      ],
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: 'https://example.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/canceled.html',
    });

    res.send({
      sessionId: session.id,
    });
  } catch (e) {
    res.status(400);
    return res.send({
      error: {
        message: e.message,
      }
    });
  }
});



app.listen(process.env.PORT || 3025, function () {
  clearTempFolder();
  cacheBrands();
  console.error("RoutingAssistant is live on port " + ((process.env.PORT) ? process.env.PORT : 3025));
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
function deleteFile(path) {
  setTimeout(function () {
    fs.unlink(path, (err) => {
      if (err) {
        if (err.code == "ENOENT") {
          console.log("File Does not exist");
          return false;
        } else {
          console.log("Some other error: " + err.message);
          return false;
        }
      } else {
        console.log(path + ': was deleted');
        return true;
      }
    });
  }, (1000 * 60 * 1));
}

/* Promise that creates a copy of the Road warrior legacy file in the tempFiles folder for data manipulation
/* and returns the path of the tempfile (EXCEL) created */
function copyLegacyTemplate(tempFileName) {
  return new Promise(function (resolve, reject) {
    fs.copyFile('./original/new.xlsx', tempFilePath + tempFileName, function (err) {
      if (err) {
        console.log("unable to copy file");
        reject(null);
        throw err;
      }
    });
    resolve(tempFilePath + tempFileName);
  });
}

// promise that returns an array of JSON Addresses {customerName, address, apt(if any:ste,apt), city,state, country};
async function getData(filePath, options) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, 'utf8', function (err, data) {
      // console.log(options);
      if (!err) {
        // console.log(data);
        let parsedJSON = papa.parse(data);
        let arrayOfAddress = [];
        let errors = [];
        let totalRecords = 0;
        // console.log("get data says....");
        // console.log(parsedJSON);
        for (let i = 1; i < parsedJSON.data.length; i++) {
          totalRecords++;
          let jsonAddress = {};
          jsonAddress.Barcode = parsedJSON.data[i][0];
          let brand =  allBrands.filter( (foundBrand) => { return (foundBrand.trackingPrefixes.includes(jsonAddress.Barcode.substring(0,7))) })
          let brandName = (brand === undefined || brand.length == 0)? "## Unregistered Brand ##" : brand[0]._id 
          // console.log("*****");
          // console.log(options);
          // console.log(parsedJSON.data[i][1]);
          // console.log("*****");
          if (parsedJSON.data[i][1] === options.loaded || parsedJSON.data[i][1] === options.attempted || parsedJSON.data[i][1] === options.delivered) {
                tempSplitAddress = (parsedJSON.data[i][3] + "").split(".");
                let splitAddress;
                if (tempSplitAddress.includes(" US")) {
                  splitAddress = tempSplitAddress;
                } else {
                  tempSplitAddress.push(" US");
                  // console.log(tempSplitAddress);
                  splitAddress = tempSplitAddress;
                }
                // console.log(splitAddress.includes(" US"));
                // console.log(splitAddress);
                if (options.extractFor === "roadWarrior" || options.extractFor === "route4me") {
                  if (splitAddress.length > 5) {
                    let country = (splitAddress[5] + "").trim();
                    let countryProcessed = "";
                    let name = ((splitAddress[0] + "").trim()) ? splitAddress[0] : "N/A";
                    let street = (splitAddress[1] + "").trim() + ", " + (splitAddress[2] + "").trim();
                    let city = (splitAddress[3] + "").trim();
                    try{
                      if (country != "UNDEFINED") {
                        // var row = worksheet.getRow(i);
                        countryProcessed = (country.length > 3) ? country.split(" ")[0][0] + country.split(" ")[1][0] : country;
                        // let state = address.State.toUpperCase();
                        // row.getCell(2).value = address.Brand;
                        // row.getCell(1).value = address.Street + ", " + address.City + ", " + state + ", " + country;

                        // row.getCell(3).value = ;
                        // row.getCell(4).value = state;
                        // row.getCell(6).value = country;
                        // row.commit();
                        
                        // console.log(JSON.stringify(address));
                      }
                    }catch(error){
                      // console.log("errors where found at " + (i + 3));
                      errors.push({name:name, line: (i+1), fullAddress: street + " " +city});
                      // console.log(populateErrors);
                    }

                    jsonAddress = {
                      Brand: brandName,
                      Name: name,//((splitAddress[0] + "").trim()) ? splitAddress[0] : "N/A",
                      // apt:(splitAddress[1]+"").trim(),
                      Street: street,// (splitAddress[1] + "").trim() + ", " + (splitAddress[2] + "").trim(),
                      City: city, //(splitAddress[3] + "").trim(),
                      State: (splitAddress[4] + "").trim(),
                      Postal: "",
                      Country: countryProcessed,
                      // Country: (splitAddress[5] + "").trim(),
                      'Color (0-1)': "",
                      Phone: "",
                      Note: "",
                      Latitude: "",
                      Longitude: "",
                      'Service Time': "",
                    }
                  } else {
                    jsonAddress = {
                      Brand: brandName,
                      Name: ((splitAddress[0] + "").trim()) ? splitAddress[0] : "N/A",
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
                }
                // console.log(jsonAddress);
                // if (jsonAddress.Name != "undefined" && jsonAddress.Name != " Unknown name") {
                  arrayOfAddress.push(jsonAddress);
                // }

                // console.log("Objects " + parsedJSON.data.length);
                
              // }
            
              
            // });  // end if brand finding
          } else {
            // console.log("already attempted/delivered");
          }
          
        } //end of for loop
        if (arrayOfAddress.length > 1) {
          // console.log("Data Processing Done . . . ");
          // console.log(arrayOfAddress);
          resolve({addresses: arrayOfAddress, errors: errors, totalRecords:totalRecords});
        } else {
          // console.log("Error getting data");  
          reject("Error Getting Data");
        }
        
        // }
      } else {
        console.log("something happened");
      }
    });
  });
}


// promise that returns an array of JSON Brands [{brandName, [tracking #1, tracking #1]}];
function getBrandsFromExcelDocument(filePath) {
  return new Promise(function (resolve, reject) {
    var data = {};
    // var allbrands = [];
    var brands = [];
    var report = [];
    reportSummary = {};
    var workbook = new Excel.Workbook();
    var totalRows = 0;

    workbook.xlsx.readFile(filePath).then(function () {
      var worksheet = workbook.getWorksheet(1);
      var headerRow = worksheet.getRow(1)
      var customerCell;
      var barcodeCell;

      headerRow.eachCell(function(cell, colNumber) {
        if((cell.value).toLowerCase() === "customer"){
          customerCell = colNumber
        }

        if((cell.value).toLowerCase() === "barcode"){
          barcodeCell = colNumber
        }
        
      });
      
      // console.log('Barcode Cell is:  ' + barcodeCell + ' ||  Customer Cell is:  ' + customerCell);

      let i = 2;
      let brandCount = 0;
      totalRows = worksheet.rowCount;
      reportSummary.totalRead = totalRows;


    if(barcodeCell && customerCell){
      worksheet.eachRow(function (row, rowNumber) {
        // console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
        let tracking = row.getCell(barcodeCell) + "";
        let trackingPrefix = tracking.substring(0,7);
        let brandName = row.getCell(customerCell) + "";
        // let searchResult = brands.filter(function(b) { return b.brandName === brandName; });
        let searchResult = allBrands.find(e => e._id === brandName);
        // console.log(brandName +" -- "+ trackingPrefix);
        
        if (searchResult) {
          var includesTrackingPrefix = searchResult.trackingPrefixes.includes(trackingPrefix);
          if(!includesTrackingPrefix){
            searchResult.trackingPrefixes.push(trackingPrefix);
            brands.push(searchResult);
            report.push({brand: brandName, tracking: trackingPrefix, action: "~ New Prefix"});
            console.log("new prefix for "+brandName+"  --> '"+ trackingPrefix +"' added for data Collection");
          }
        }else{
          // console.log(".... FOUND NEW BRAND ...")
          brands.push({_id: brandName, trackingPrefixes:[trackingPrefix]});
          report.push({brand: brandName, tracking: trackingPrefix, action: "+ New Brand"});
          brandCount++;
          // console.log(searchResult);
          // console.log("brands array length => " + searchResult.length);
          // console.log("Searched Brand Includes Tracking? " +brands[brandCount].trackingPrefix.includes(tracking));
          // console.log("Searched Brand Includes TrackingPrefix? " +brands[brandCount].trackingPrefix.includes(trackingPrefix));
        }
      });
    }else{
      reject("Unable to determine Customer Columm or Barcode Columm");
    }

      

      if (brands) {
        reportSummary.totalBrands = brands.length;
        // console.log("Data Processing Done . . . ");
        // console.log("BrandCounter = " + brandCount);
        // console.log("Total Rows Read: " + totalRows);
        // console.log("New Brands = " + brands.length);

        // console.log("Will Not RESOLVE GetBrands from Excell -- developmenet + ");
        resolve({brands: brands, report: report, reportSummary});
        
        // res.redirect(APP_DIRECTORY + "/brandsUpload")
      } else {
        // res.redirect(APP_DIRECTORY + "/")
        // console.log("Total Brand Count = " + brandCount);
        // console.log("Wont REJECT either GetBrands from Excell -- developmenet + ");
        reject("Error Getting Data");
      }

      i++;
      // console.log(JSON.stringify(address));



      // return workbook.xlsx.writeFile(tempFilePath + "legacyNew.xlsx");
    })


   

  });
}


function getDataForPrint(filePath, options) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, 'utf8', function (err, data) {
      // console.log(options);
      if (!err) {
        // console.log(data);
        let parsedJSON = papa.parse(data);
        let arrayOfAddress = [];
        for (let i = 1; i < parsedJSON.data.length; i++) {
          let jsonAddress;
          if (parsedJSON.data[i][1] === options.loaded || parsedJSON.data[i][1] === options.attempted) {
            // console.log(parsedJSON.data[i][1]);
            // console.log(options);
            tempSplitAddress = (parsedJSON.data[i][3] + "").split(".");
            let splitAddress;
            if (tempSplitAddress.includes(" US")) {
              splitAddress = tempSplitAddress;
            } else {
              tempSplitAddress.push(" US");
              // console.log(tempSplitAddress);
              splitAddress = tempSplitAddress;
            }
            // console.log(splitAddress.includes(" US"));
            // console.log(splitAddress);

            if (splitAddress.length > 5) {
              jsonAddress = {
                Name: ((splitAddress[0] + "").trim()) ? splitAddress[0] : "N/A",
                // apt:(splitAddress[1]+"").trim(),
                Street: (splitAddress[2] + "").trim() + ", " + (splitAddress[1] + "").trim(),
                City: (splitAddress[3] + "").trim(),
                State: (splitAddress[4] + "").trim(),
                Barcode: parsedJSON.data[i][0].trim()
              }
            } else {

              jsonAddress = {
                Name: ((splitAddress[0] + "").trim()) ? splitAddress[0] : "N/A",
                Street: (splitAddress[1] + "").trim(),
                City: (splitAddress[2] + "").trim(),
                State: (splitAddress[3] + "").trim(),
                Barcode: parsedJSON.data[i][0].trim()

              }
            }
            // console.log(jsonAddress.Name);
            if (jsonAddress.Name != "undefined" && jsonAddress.Name != " Unknown name") {
              arrayOfAddress.push(jsonAddress);
            }
          } else {
            // console.log("already attempted/delivered");
          }
        }

        if (arrayOfAddress) {
          console.log("Data Processing Done . . . ");
          // console.log(arrayOfAddress);
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


function populateExcelData(fileName, addresses) {
  return new Promise(function (resolve, reject) {

    var workbook = new Excel.Workbook();

    workbook.xlsx.readFile("original/legacy.xlsx").then(function () {
      var worksheet = workbook.getWorksheet(1);
      let i = 2;
      for (address of addresses) {
        let country = address.Country.toUpperCase();
        // console.log("countr: " + country);
        if (country != "UNDEFINED") {
          country = (country.length > 3) ? country.split(" ")[0][0] + country.split(" ")[1][0] : country;
          let state = address.State.toUpperCase();
          var row = worksheet.getRow(i);
          row.getCell(1).value = address.Name;
          row.getCell(2).value = address.Street;
          row.getCell(3).value = address.City;
          row.getCell(4).value = state;
          row.getCell(6).value = country;
          row.getCell(9).value = address.Brand;
          row.commit();
          i++;
          // console.log(JSON.stringify(address));
        }
      }
      fs.mkdir(tempFilePath, (err) => {
        if (err) {
          // console.log(err.message);
          // console.log(err.code);
          if (err.code === "EEXIST") {
            console.log("Directory ALREADY Exists.");
            resolve(workbook.xlsx.writeFile(tempFilePath + fileName));
          } else {
            reject(err.code);
            throw err;
          }
        }else{
          console.log("" + tempFilePath + " Directory was created.");
          resolve(workbook.xlsx.writeFile(tempFilePath + fileName));
        }
      });
      // return workbook.xlsx.writeFile(tempFilePath + "legacyNew.xlsx");
    })
  });
}

// http://localhost:3025/routingAssistanttmp/RW_-_Tue_Jun_13_2023_19-24_ejerenwaavis@gmail.com.xlsx

async function populateExcelDataRoute4Me(fileName, addresses) {
  return new Promise(function (resolve,reject){
  
    var workbook = new Excel.Workbook();
    let populateErrors = [];
    workbook.xlsx.readFile("original/r4me-original.xlsx").then(function () {
      var worksheet = workbook.getWorksheet(1);
      let i = 2;
      let e = 3;
      for (address of addresses) {
        let country = address.Country.toUpperCase();
        // console.log("country: " + country);
        // console.log(address.Name);
        try{
          if (country != "UNDEFINED") {
            var row = worksheet.getRow(i);
            country = (country.length > 3) ? country.split(" ")[0][0] + country.split(" ")[1][0] : country;
            let state = address.State.toUpperCase();
            row.getCell(2).value = address.Brand;
            row.getCell(1).value = address.Street + ", " + address.City + ", " + state + ", " + country;

            // row.getCell(3).value = ;
            // row.getCell(4).value = state;
            // row.getCell(6).value = country;
            row.commit();
            
            // console.log(JSON.stringify(address));
          }
        }catch(error){
          console.log("errors where found at " + (i + 3));
          populateErrors.push({name:address.Name, line: (e), fullAddress: address.street + "" + address.city});
          console.log(populateErrors);
        }
        i++;
        e++;
      }

      fs.mkdir(tempFilePath, (err) => {
        if (err) {
          // console.log(err.message);
          // console.log(err.code);
          if (err.code === "EEXIST") {
            console.log("Directory ALREADY Exists.");
            workbook.xlsx.writeFile(tempFilePath + fileName); 
            // console.log(populateErrors);
            resolve(populateErrors);
          } else {
            throw err;
            reject(err.code)
          }
        }else{
          console.log("'/tmp' Directory was created.");
          workbook.xlsx.writeFile(tempFilePath + fileName);
          // console.log(populateErrors);
          resolve(populateErrors);
        }
      });
      // return workbook.xlsx.writeFile(tempFilePath + "legacyNew.xlsx");
    })

  });
  
}


function populateExcelDataForPrint(fileName, addresses, userName) {
  var workbook = new Excel.Workbook();

  workbook.xlsx.readFile("original/print.xlsx").then(function () {
    var worksheet = workbook.getWorksheet(1);
    var row = worksheet.getRow(1);
    row.getCell(2).value = userName;
    row.getCell(5).value = "Packages: " + addresses.length;
    row.commit();
    let i = 3;
    for (address of addresses) {
      if (address.Barcode != "UNDEFINED") {
        let state = address.State.toUpperCase();
        var row = worksheet.getRow(i);
        row.getCell(1).value = address.Name;
        row.getCell(2).value = address.Street;
        row.getCell(3).value = address.City;
        row.getCell(4).value = state;
        row.getCell(5).value = address.Barcode;
        row.commit();
        i++;
        // console.log(JSON.stringify(address));
      }
    }
    fs.mkdir("./tmp", (err) => {
      if (err) {
        // console.log(err.message);
        // console.log(err.code);
        if (err.code === "EEXIST") {
          console.log("Directory ALREADY Exists.");
          return workbook.xlsx.writeFile(tempFilePath + fileName);
        } else {
          throw err;
        }
      }
      console.log("'/tmp' Directory was created.");
      return workbook.xlsx.writeFile(tempFilePath + fileName);
    });
    // return workbook.xlsx.writeFile(tempFilePath + "legacyNew.xlsx");
  })
}

async function cacheBrands(){
  allBrands = await Brand.find({},"-__v");
  stringBrands = JSON.stringify(allBrands);
  // reCon = JSON.parse(stringBrands);
  // console.log(reCon);
  fs.writeFile(tempFilePath + 'brands.txt', stringBrands, err => {
  if (err) {
    console.error(err);
  }
  
  // file written successfully
  console.error("Brands written to file");
});
}


async function processBrandUpdates(brands){
  return new Promise((resolve,reject) => {
    
    newBrands = [];
    modifiedBrands = [];

    brands.forEach(brand => {
    
     // put a promis that will call mongo db and check for exists before returnning to continue

      checkIfBrandExist(brand).then(function(exists) {
        // console.log("BrandFOund: ");
        // console.log(existResult);
        if(!exists){
          addBrand(brand).then( (x) =>{
            newBrands.push({_id: x._id, trackingPrefix: x.trackingPrefixes});
            console.log("Successsfully Added Brand");
            console.log(brand);
            // console.log(x);
            // resolve(x);
          }).catch((err) => {
            console.log("Failed to add Brand");
            console.log(err.message);
            // resolve(err);
          })
        }else{
          updateBrand(brand).then((updatedBrand) => {
            modifiedBrands.push({_id: updatedBrand._id, trackingPrefix: updatedBrand.updatedBrand});
            console.log(updatedBrand);
            // res.send(updatedBrand);
          }).catch(err =>{
            console.log(err);
            // resolve(err);
          })
        }
      }).catch((err)=> {
        //add non existent brand and then continue
        console.log("***");
        console.log(err.message);
        reject(err.message);
      });
      
    });
    console.log("Done Processing....pushing back to main thread");
    resolve({modifiedBrands: modifiedBrands, newBrands:newBrands});
  })
}


async function checkIfBrandExist(brand){
  return new Promise(function(resolve, reject){
    Brand.exists({_id:brand._id}, async function (err,exists) {
      if(!err){
        // console.log("Exists function");
        // console.log(exists);
        resolve(exists);
        
      }else{
        reject({description: "Failed to Check if document exists", message:"EEXISTSFAILED"})
      }
    });
  })
}


async function addBrand(brand) {
  return new Promise(function (resolve, reject) {
    
    // console.log(brand);

    // console.log("Attempting Adding Brand");
    const newBrand = new Brand(brand);
    newBrand.save(function(err,savedDoc){
      if(!err){
        // console.log(savedDoc);
        // console.log(newBrand._id+" saved succeffully");
        resolve(savedDoc);
      }else{
          // console.log("Failed to Save Brand");
          // console.log(err.message);
          // console.log("err.code");
          // console.log(err.code);
          reject(err)
      }
    });

    // console.log("Brand Already Exists Checking and Updating for Tracking Prefixes");

  });
}


async function updateBrand(brand) {
  return new Promise(function (resolve, reject) {
    
    // console.log("Brand Already Exists Checking and Updating for Tracking Prefixes");
    Brand.updateOne(
      { _id: brand._id },
      { $addToSet: { trackingPrefixes: { $each: brand.trackingPrefixes } } },
      function (err,updatedBrand) {
        // console.log(err);
        if(!err){
          if(updatedBrand.nModified > 0){
            // console.log("Brand");
            // console.log(brand);
            // console.log("Updated Brand");
            // console.log(updatedBrand);
            console.log(brand._id+" Modified succeffully");
            resolve(brand);
          }else{
            reject("ENOPREFIX");
            // console.log("No new Prefixes to be added");
          }
        }else{
          console.log("Brand Update Failed");
          console.log(err);
          reject("EFAILEDTOUPDATE")
        }
      }
    )

  });
}

async function clearTempFolder(){
  fs.readdir(tempFilePath, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    if(file.startsWith("R4M") || file.startsWith("RW") || file.startsWith("bra")){
      fs.unlink(path.join(tempFilePath, file), (err) => {
        if (err) throw err; 
      });
    }
  }
});
}

function Body(title, error, message) {
  this.title = title;
  this.error = error;
  this.message = message;
  this.domain = APP_DIRECTORY;
  this.publicFolder = PUBLIC_FOLDER;
  this.publicFiles = PUBLIC_FILES;
}

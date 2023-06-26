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
3
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

        let today = new Date;

        if (extractFor != "print") {
          let fileNamePrefix = (extractFor === "roadWarrior") ? "RW - " : "R4M - ";
          let tempFileName = (fileNamePrefix + today.toDateString() + '_' + today.getHours() + '-' + today.getMinutes() + " " + req.user._id + '.xlsx').replace(/ /g, "_");
          getData(upload.path, { loaded: loaded, attempted: attempted, delivered: delivered, extractFor: extractFor }).then(function (addresses) {
            console.log("Records read: " + addresses.length);
            if (extractFor === "roadWarrior") {
              console.log("running for ROAD WARIOR");
              populateExcelData(tempFileName, addresses);
            } else {
              console.log("running for ROUTE 4 ME");
              populateExcelDataRoute4Me(tempFileName, addresses);
            }
            res.render("excellDownload.ejs", {
              filePath: tempFilePath  + tempFileName,
              body: new Body("Download", "", ""),
              user: req.user,
            });
          })
        }

        else {
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
      res.render("brandCapture.ejs", {
        body: new Body("Brands Upload - TCS", "", ""),
        allBrands: null,
        updates:null,
        newBrands:null,
        user: (req.user)? req.user : null,
      });
    }else{
      console.log("Unauthenticated Request ");
      res.redirect(APP_DIRECTORY + "/");
    }
  })
  .post(function (req, res) {
    if (req.isAuthenticated() || req.hostname.includes("localhost")) {
      var form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        let upload = files.loadXLS;

        getBrandsFromExcelDocument(upload.path).then(async function (data) {

          if (data != "Error Getting Data"){
            console.log("Records read: " + data.length);
            console.log("Checking for and Uploading New Brands ... ");
            let newUpdates = [];
            let newBrandsAdded = [];
            let allBrandsFound = [];
            var processedItem = 0;

            await data.forEach(dataBrand => {
              allBrandsFound.push(dataBrand._id);
              Brand.exists({_id:dataBrand._id}, async function (err,exists) {
                if(exists){
                  // console.log("Brand Already Exists Checking and Updating for Tracking Prefixes");
                  await Brand.updateOne(
                    { _id: dataBrand._id },
                    { $addToSet: { trackingPrefixes: { $each: dataBrand.trackingPrefixes } } },
                    function (err,updatedBrand) {
                      // console.log(err);
                      if(!err){
                        if(updatedBrand.nModified > 0){
                          console.log(dataBrand);
                          console.log(dataBrand._id+" Modified succeffully");
                            newUpdates.push(dataBrand._id);
                        }else{
                          // console.log("No new Prefixes to be added");
                        }
                      }else{
                        console.log("Brand Update Failed");
                        console.log(err);
                      }
                    }
                  )
                }else{
                  console.log("New Brand Found, attempting upload");
                  const newBrand = new Brand(dataBrand);
                  newBrand.save(function(err,savedDoc){
                    if(!err){
                      console.log(newBrand);
                      console.log(newBrand._id+" saved succeffully");
                            newBrandsAdded.push(newBrand._id)
                    }else{
                        console.log("Failed to Save Brand");
                        console.log(err);

                    }
                  });
                }
              });
              
              processedItem++;
              
              if(processedItem >= data.length){
                console.log("Data Length " + data.length);
                console.log("processedItem : "+ processedItem);
                console.log("\n------\nAll Brands Processed");
                console.log(allBrandsFound);
                console.log("\n------\nUpdated Brands");
                console.log(newUpdates);
                console.log("\n------\nNew Brands Added");
                console.log(newBrandsAdded);
                cacheBrands();
                res.render("brandCapture.ejs", {
                  body: new Body("Brands Upload - LSAsistant", "", "Brand Updates Done"),
                  allBrands: allBrandsFound,
                  updates: newUpdates,
                  newBrands: newBrandsAdded,
                  user: (req.user) ? req.user : null,
                });
              }
            });
            
          }else{
            res.render("brandCapture.ejs", {
                  body: new Body("Brands Upload - LSAsistant", "Error Readidng Data", ""),
                  allBrands: null,
                  updates: null,
                  newBrands: null,
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
    req.logout();
    console.log("Logged Out");
    res.redirect(APP_DIRECTORY + "/");

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
  console.log("RoutingAssistant is live on port " + ((process.env.PORT) ? process.env.PORT : 3025));
  // print("./")
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
        // console.log("get data says....");
        // console.log(parsedJSON);
        for (let i = 1; i < parsedJSON.data.length; i++) {
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
                    jsonAddress = {
                      Brand: brandName,
                      Name: ((splitAddress[0] + "").trim()) ? splitAddress[0] : "N/A",
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
          console.log("Data Processing Done . . . ");
          // console.log(arrayOfAddress);
          resolve(arrayOfAddress);
        } else {
          console.log("Error getting data");  
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
    var brands = [];
    var report = [];
    var workbook = new Excel.Workbook();

    workbook.xlsx.readFile(filePath).then(function () {
      var worksheet = workbook.getWorksheet(1);
      let i = 2;
      let brandCount = 0;
      let totalRows = worksheet.rowCount;
      console.log(totalRows);

      worksheet.eachRow(function (row, rowNumber) {
        // console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
        let tracking = row.getCell(2) + "";
        let trackingPrefix = tracking.substring(0,7);
        let brandName = row.getCell(5) + "";
        // let searchResult = brands.filter(function(b) { return b.brandName === brandName; });
        let searchResult = brands.find(e => e._id === brandName);
        // console.log(brandName +" -- "+ trackingPrefix);
        
        if (searchResult) {
          var includesTrackingPrefix = searchResult.trackingPrefixes.includes(trackingPrefix);
          if(!includesTrackingPrefix){
            searchResult.trackingPrefixes.push(trackingPrefix)
            console.log("new prefix for "+brandName+"  --> '"+ trackingPrefix +"' added for data Collection");
          }
        }else{
          // console.log(".... FOUND NEW BRAND ...")
          brands.push({_id: brandName, trackingPrefixes:[trackingPrefix]});
          brandCount++;
          // console.log(searchResult);
          // console.log("brands array length => " + searchResult.length);
          // console.log("Searched Brand Includes Tracking? " +brands[brandCount].trackingPrefix.includes(tracking));
          // console.log("Searched Brand Includes TrackingPrefix? " +brands[brandCount].trackingPrefix.includes(trackingPrefix));
        }


      });

      

      if (brands) {
        console.log("Data Processing Done . . . ");
        // console.log("BrandCounter = " + brandCount);
        console.log("Brand Array = " + brands.length);
        // console.log( brands);
        resolve(brands);
        // res.redirect(APP_DIRECTORY + "/brandsUpload")
      } else {
        // res.redirect(APP_DIRECTORY + "/")
        console.log("Total Brand Count = " + brandCount);
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
          return workbook.xlsx.writeFile(tempFilePath + fileName);
        } else {
          throw err;
        }
      }
      console.log("" + tempFilePath + " Directory was created.");
      return workbook.xlsx.writeFile(tempFilePath + fileName);
    });
    // return workbook.xlsx.writeFile(tempFilePath + "legacyNew.xlsx");
  })
}

// http://localhost:3025/routingAssistanttmp/RW_-_Tue_Jun_13_2023_19-24_ejerenwaavis@gmail.com.xlsx

function populateExcelDataRoute4Me(fileName, addresses) {
  var workbook = new Excel.Workbook();

  workbook.xlsx.readFile("original/r4me-original.xlsx").then(function () {
    var worksheet = workbook.getWorksheet(1);
    let i = 2;
    for (address of addresses) {
      let country = address.Country.toUpperCase();
      // console.log("countr: " + country);
      if (country != "UNDEFINED") {
        country = (country.length > 3) ? country.split(" ")[0][0] + country.split(" ")[1][0] : country;
        let state = address.State.toUpperCase();
        var row = worksheet.getRow(i);
        row.getCell(2).value = address.Brand;
        row.getCell(1).value = address.Street + ", " + address.City + ", " + state + ", " + country;

        // row.getCell(3).value = ;
        // row.getCell(4).value = state;
        // row.getCell(6).value = country;
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
  console.log("Brands written to file");
});
}

async function clearTempFolder(){
  fs.readdir(tempFilePath, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.rm(path.join(tempFilePath, file), (err) => {
      if (err) throw err; 
    });
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

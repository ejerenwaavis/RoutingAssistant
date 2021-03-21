require("dotenv").config();

const tempFilePath = 'tmp/';


const express = require("express");
const app = express();
const ejs = require("ejs");
const papa = require("papaparse");
const bodyParser = require("body-parser");
const fs = require("fs");
const Excel = require('exceljs');
var formidable = require('formidable');


// Configure app to user EJS abd bodyParser
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(express.static("tempFiles"));
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

      let tempFileName = (new Date).toDateString() + ' USER_ID' + '.xlsx';
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

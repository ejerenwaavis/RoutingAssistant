require("dotenv").config();

const tempFilePath = './tempFiles/';


const express = require("express");
const app = express();
const ejs = require("ejs");
const papa = require("papaparse");
const bodyParser = require("body-parser");
const fs = require("fs");
const XL = require('xlsx');


// Configure app to user EJS abd bodyParser
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(express.static("."));
app.use(express.json());


let tempFileName = (new Date).toDateString() + ' USER._ID' + '.xlsx';
 copyLegacyTemplate(tempFileName).then(function(path){
  // console.log(path);
  getData(tempFilePath+"eli.csv").then(function(addresses){


    // console.log(addresses);
    //fill the excell sheet with the address data using for loop
    const file = XL.readFile(path);
    // const wb = XL.utils.book_new();
    // wb.SheetNames.push("Uploads");
    const ws = XL.utils.json_to_sheet(addresses);
    // wb.Sheets["Uploads"] = ws;
    XL.utils.book_append_sheet(file,ws)
    // XL.utils.book_append_sheet(ws)
    // Writing to our file
    XL.writeFile(file,path);
  });

});





app.listen(process.env.PORT || 3000, function() {
  console.log("LS ASsistant is live on port "+ ((process.env.PORT)?process.env.PORT:3000) );
});




/************ helper function ***************/


// prints all the files in the folder path supplied
async function print(path) {
  const dir = await fs.promises.opendir(path);
  for await (const dirent of dir) {
    console.log(dirent.name);
  }
}

/* Promise that creates a copy of the Road warrior legacy file in the tempFiles folder for data manipulation
/* and returns the path of the tempfile (EXCEL) created */
function copyLegacyTemplate(tempFileName){
 return new Promise(function(resolve,reject){
  fs.copyFile('./original/new.xlsx', tempFilePath+tempFileName, function(err) {
    if (err) {
      reject(null);
      throw err;
    }
  });
  resolve(tempFilePath+tempFileName);
});
}

// promise that returns an array of JSON Addresses {customerName, address, apt(if any:ste,apt), city,state, country};
function getData(filePath){
  return new Promise(function(resolve,reject){
  fs.readFile(filePath, 'utf8', function(err,data){
  if(!err){
    // console.log(data);
    let parsedJSON = papa.parse(data);
    let arrayOfAddress = [];
    for(let i=1; i<parsedJSON.data.length; i++){
      let jsonAddress;
      splitAddress = (parsedJSON.data[i][3]+"").split(".");
      if(splitAddress.length>5){
        jsonAddress = {
          Name: splitAddress[0],
          // apt:(splitAddress[1]+"").trim(),
          Street:(splitAddress[2]+"").trim() +", "+ (splitAddress[1]+"").trim(),
          City:(splitAddress[3]+"").trim(),
          State:(splitAddress[4]+"").trim(),
          Postal:"",
          Country:(splitAddress[5]+"").trim(),
          'Color (0-1)':"",
          Phone:"",
          Note:"",
          Latitude:"",
          Longitude:"",
          'Service Time':"",
        }
      }else{
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
          Name: (splitAddress[0]+"").trim(),
          Street:(splitAddress[1]+"").trim(),
          City:(splitAddress[2]+"").trim(),
          State:(splitAddress[3]+"").trim(),
          Postal:"",
          Country:(splitAddress[4]+"").trim(),
          'Color (0-1)':"",
          Phone:"",
          Note:"",
          Latitude:"",
          Longitude:"",
          'Service Time':"",

        }
      }
      // console.log(jsonAddress.Name);
      if(jsonAddress.Name == "undefined"){
        console.log("End of File");
      }else{
        arrayOfAddress.push(jsonAddress);
      }
    }
    if(arrayOfAddress){
      console.log("Data Processing Done . . . ");
      resolve(arrayOfAddress);
    }else{
      reject("Error Getting Data");
    }
  }else{
    console.log("something happened");
  }
});
});
}

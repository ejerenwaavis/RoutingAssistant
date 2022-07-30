function optimize(evt) {
  let firstStopAddress = $($(evt)).attr("firstStop");
  let stops = JSON.parse($($("[stringifystops]")[0]).text());
  let hereApiKey = "";
  $.get("/hereApiKey", function(res) {
    hereApiKey = res;

  timedGeoCodeStops(stops).then(function(newStops){
      console.log(newStops);
    });
  })
}

async function timedGeoCodeStops(stops){
  var newStops = [];
  for(stop of stops){
    var address = stop.Street + ", " + stop.City;
    await new Promise(function(resolve,reject){
    	setTimeout(function(){
      	resolve();},200)}); // causes a 220 milisecond pause
    $.get("https://geocode.search.hereapi.com/v1/geocode?q=" + address + "&apiKey=14nO-3bBvP2yuJ6ShZ05VbEs37DXUVENPrO_K_K-Pmo", function(response) {

/****** MAtch street adress of stop with response before assigning the GeoCodes */
      if (response.items[0]) {
        // console.log(stop);
        // console.log("GeoSearch Response: ____0_____");
        console.log(response.items[0]);
    // console.log(response.items[0].position);
    // stop.position = response.items[0].position;
        // console.log("New Stop b4 Addidtion _________");
  // newStops.push(stop);
        // console.log(i);
        // console.log(stop);
      } else {
        console.log("Error");
        console.log(response);
      }
    });
  }
  return newStops;
}

function gecocodeStops(stops) {
  return new Promise(function(resolve, reject) {
    // console.log(stops);
    var newStops = [];
    let c = 0;
    for (let i = 0; i < stops.length; i++) {
      setTimeout(function() {
        let stop = stops[i];
        var address = stop.Street + ", " + stop.City;
        console.log("inside for Loop --> "+address);
        $.get("https://geocode.search.hereapi.com/v1/geocode?q=" + address + "&apiKey=14nO-3bBvP2yuJ6ShZ05VbEs37DXUVENPrO_K_K-Pmo", function(response) {
          if (response) {
            console.log("GeoSearch Response: _________");
            console.log(response.items[0].position);
            stop.position = response.items[0].position;
            console.log("New Stop b4 Addidtion _________");
            console.log(stop);
            newStops.push(stop);
            // console.log(i);
            // console.log(stop);
            if ((i+1) === (stops.length)) {
              console.log("last one");
              console.log("" + i + "/" + (stops.length) + " stops");
              resolve(newStops);
            } else {
              console.log("" + i + "/" + (stops.length) + " stops");
            }
          } else {
            console.log(response);
          }
        });
      }, 350);

    };
  });
};

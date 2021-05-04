function optimize(evt) {
  let firstStopAddress = $($(evt)).attr("firstStop");
  let stops = JSON.parse($($("[stringifystops]")[0]).text());
  let hereApiKey = "";
  $.get("/hereApiKey", function(res) {
    hereApiKey = res;

    gecocodeStops(stops).then(function(newStops) {
      console.log(newStops);
      console.log("___________________________________");
    });

  })
}



function gecocodeStops(stops) {
  return new Promise(function(resolve, reject) {
    // console.log(stops);
    let newStops = [];
    let c = 0;
    for (let i = 0; i < stops.length; i++) {
      var stop = stops[i];
      var address = stop.Street + ", " + stop.City;
      // console.log("inside for Loop --> "+address);
      setTimeout(function() {
        $.get("https://geocode.search.hereapi.com/v1/geocode?q=" + address + "&apiKey=14nO-3bBvP2yuJ6ShZ05VbEs37DXUVENPrO_K_K-Pmo", function(response) {
          if (response) {
            // console.log(response);
            stop.position = response.items[0].position;

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

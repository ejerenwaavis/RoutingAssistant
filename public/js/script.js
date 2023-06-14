const domain = $('#domain').attr('domain');


$(function(){
  $("#roadWarrioirLink").hide();
  $("#optimizeButton").hide();
})

function deleteFile(path){
  $.post(domain + "/delete", {path:path}, function(status){
    if(200){
      if(!path.includes('R4M'))
      $("#roadWarrioirLink").fadeIn("fast").fadeOut("fast").fadeIn("slow");
      return console.log("sucessfull registered deletion");
    }
  });
}


function selectStop(evt){
  let element = $(evt);
  stop = JSON.parse(element.attr("stop"));
  $($('[stop]')).removeClass("active");
  element.addClass("active");
  $("#stopSelected").html(stop.Street + ", " + stop.City)
  $($('[firstStop]')).attr("firstStop",""+stop.Street + ", " + stop.City);
  $("#optimizeButton").fadeIn("fast").fadeOut("fast").fadeIn("slow");
}

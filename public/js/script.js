function deleteFile(path){
  $.post("/delete", {path:path}, function(status){
    if(200)
    return console.log("sucessfull registered deletion");
  });
}

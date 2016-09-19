var platformModule = require("platform");
var frameModule = require("ui/frame");
var observable = require("data/observable");
var observableArray = require("data/observable-array");

var permissions = require( "nativescript-permissions");
var imagepickerModule = require("nativescript-imagepicker");

var bghttpModule = require("nativescript-background-http");
var session = bghttpModule.session("image-upload");
var fs = require("file-system");
var enums = require("ui/enums");
var imageSource = require("image-source");
var imageModule = require("ui/image");

var imageItems = new observableArray.ObservableArray();
var mainViewModel = new observable.Observable();
mainViewModel.set("imageItems", imageItems);

var page;
var imageName;

function pageLoaded(args) {
	page = args.object;
    page.bindingContext = mainViewModel;
}

function onSelectMultipleTap(args) {	
	var context = imagepickerModule.create({
		mode: "multiple"
	});

    if (platformModule.device.os === "Android" && platformModule.device.sdkVersion >= 23)  {   
        permissions.requestPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE, "I need these permissions to read from storage")
        .then(function() {
            console.log("Permissions granted!");
            startSelection(context);
        })
        .catch(function() {
            console.log("Uh oh, no permissions - plan B time!");
        });
    } else {
        startSelection(context);
    }	
}

function onSelectSingleTap(args) {	
	var context = imagepickerModule.create({
		mode: "single"
	});

	if (platformModule.device.os === "Android" && platformModule.device.sdkVersion >= 23) {   
        permissions.requestPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE, "I need these permissions to read from storage")
        .then(function() {
            console.log("Permissions granted!");
            startSelection(context);
        })
        .catch(function() {
            console.log("Uh oh, no permissions - plan B time!");
        });
    } else {
        startSelection(context);
    }
}

function sendImages(filePath) {

    console.log("in sendImage - imageName: " + imageName);
    console.log("in sendImage - filePath: " + filePath);

    var request = {
        url: "http://httpbin.org/post",
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "File-Name": imageName.toString()
        },
        description: "{ 'uploading': " + imageName.toString() + " }"
    };
    
    var task = session.uploadFile(filePath, request);
    
    task.on("progress", logEvent);
    task.on("error", logEvent);
    task.on("complete", logEvent);
    
    function logEvent(e) {      
        console.log("----------------");
        console.log('Status: ' + e.eventName);
        console.log('Error: ' + e.error);

        // console.log(e.object);
        if (e.totalBytes !== undefined) {
            console.log('current bytes transfered: ' + e.currentBytes);
            console.log('Total bytes to transfer: ' + e.totalBytes);
        }  
    }

    return task;
}

function startSelection(context) {
	context
		.authorize()
		.then(function() {
            imageItems.length = 0;
			return context.present();
		})
		.then(function(selection) {
			selection.forEach(function(selected) {
                imageName = new Date().getTime().toString() + ".jpg";
                
                var tempFolder = fs.knownFolders.temp();
                var filePath = fs.path.join(tempFolder.path, imageName);
                
                selected.getImage().then(function(resultImg) {

                    var isSaved = resultImg.saveToFile(filePath, enums.ImageFormat.jpg);

                    console.log("is image saved!? : " + isSaved);
                    var saved = imageSource.fromFile(filePath);

                }).then(function () {
                    // once we have saved photo - pass its path as fileUri to sendImage(fileUri)
                    console.log("saved filePath: " + filePath); 

                    // uploadtask and imageName for use in binding
                    selected.uploadTask = sendImages(filePath);  
                    selected.imageName = imageName;

                    imageItems.push(selected);

                }).catch(function (e) {
                    console.log(e);
                    console.log(e.stack);
                })               
                
			});

		}).catch(function (e) {
			console.log(e);
            console.log(e.stack);
		});
}

function listViewItemTap(args) {  
    frameModule.topmost().navigate({
        moduleName: 'full-screen-page',
        context: args.view.bindingContext
    });
}

exports.mainViewModel = mainViewModel;

exports.pageLoaded = pageLoaded;
exports.onSelectMultipleTap = onSelectMultipleTap;
exports.onSelectSingleTap = onSelectSingleTap;
exports.listViewItemTap = listViewItemTap;
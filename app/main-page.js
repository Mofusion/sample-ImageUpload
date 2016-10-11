var platformModule = require("platform");
var frameModule = require("ui/frame");
var observable = require("data/observable");
var observableArray = require("data/observable-array");
var fs = require('file-system');
var enums = require("ui/enums");
var permissions = require( "nativescript-permissions");
var imagepickerModule = require("nativescript-imagepicker");

var bghttpModule = require("nativescript-background-http");
var session = bghttpModule.session("image-upload");

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

function sendImages(selected) {
    let fileUri = selected.fileUri;
    imageName = extractImageName(fileUri);
    
    var request = {
        url: "http://httpbin.org/post",
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "File-Name": imageName
        },
        description: "{ 'uploading': " + imageName + " }"
    };
    
    //get the image source and upload from there
    selected.getImage().then(imageSource => {
        let temp = fs.knownFolders.temp();
        let uniqueName = '_' + Math.random().toString(36).substr(2, 9);
        let filePath = fs.path.join(temp.path, uniqueName + ".jpg");
        let saved = imageSource.saveToFile(filePath, enums.ImageFormat.jpeg);
        console.log(`item saved:${saved}`);
        var task = session.uploadFile(filePath, request);
    
        task.on("progress", logEvent);
        task.on("error", logEvent);
        task.on("complete", x => cleanFile(filePath));

    });
    //return task;
}
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
function cleanFile(file){
    fs.remove(file);
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
                sendImages(selected);
                //selected.uploadTask = sendImages(selected);             
                selected.imageName = imageName;
                
                console.log("----------------");
                console.log("uri: " + selected.uri);           
                console.log("fileUri: " + selected.fileUri);
                console.log('Image name:' + imageName);
                
                imageItems.push(selected);
			});
			//list.items = selection;
		}).catch(function (e) {
			console.log(e);
		});
}

function extractImageName(fileUri) {
    var pattern = /[^/]*$/;
    var imageName = fileUri.match(pattern);
    
    return imageName[0];
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
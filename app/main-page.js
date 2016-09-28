var platformModule = require("platform");
var frameModule = require("ui/frame");
var observable = require("data/observable");
var observableArray = require("data/observable-array");

var imagepickerModule = require("nativescript-imagepicker");

var permissions = require( "nativescript-permissions");
var bghttpModule = require("nativescript-background-http");
var session = bghttpModule.session("image-upload");
var fs = require("file-system");
var enums = require("ui/enums");
var imageSource = require("image-source");
var imageModule = require("ui/image");

var imageItems = new observableArray.ObservableArray();
var mainViewModel = new observable.Observable();

var isAndroid = require("platform").isAndroid;
var isIOS = require("platform").isIOS;

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

    startSelection(context);
}

function onSelectSingleTap(args) {
    var context = imagepickerModule.create({
        mode: "single"
    });

    startSelection(context);
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
        .then(function () {
            imageItems.length = 0;
            return context.present();
        })
        .then(function (selection) {
            selection.forEach(function (selected) {
                imageName = new Date().getTime().toString() + ".jpg";
                var tempFolder = fs.knownFolders.temp();
                var filePath = fs.path.join(tempFolder.path, imageName);

                requestFileAccessPermission(selected.fileUri).then(() => {
                    console.log("Upload fileUri: " + selected.fileUri);

                    selected.uploadTask = sendImages(selected.fileUri);
                    selected.imageName = imageName;
                    imageItems.push(selected);
                }).catch(() => {
                    console.log("fileUri is not available, request and save temporary image.");

                    selected.getImage().then(function (resultImg) {
                        var isSaved = resultImg.saveToFile(filePath, "jpg"); // TODO: At some point the temp has to be cleaned up.

                        selected.uploadTask = sendImages(filePath);
                        selected.imageName = imageName;
                        imageItems.push(selected);

                    }).catch(function (e) {
                        console.log(e.stack);
                    })
                })
            });

        }).catch(function (e) {
            console.log(e.stack);
        });
}

function requestFileAccessPermission(fileUri) {
    if (!fileUri) {
        return Promise.reject("File uri not available");
    }
    if (isAndroid) {
        if (platformModule.device.os === "Android" && platformModule.device.sdkVersion >= 23) {
            return permissions.requestPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE, "I need these permissions to read from storage");
        } else {
            // TODO: Check if the android manifest has READ_EXTERNAL_STORAGE permissions.
            return Promise.resolve();
        }
    }
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

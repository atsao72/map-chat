var mySessionId;
var map;
var userLocation;
var markersMap = {};
var markerImage;
var watchPosition;
var advanced = false;

var locationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 10000
};

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;',
    "卐": 'I am a dick ',
    "卍": 'I am a dick '
};

function initialize() {

    var defaultLatLng = new google.maps.LatLng(32.078043, 34.774177); // Add the coordinates

    markerImage = {
        url: 'images/blue_marker.png',
        scaledSize: new google.maps.Size(30, 30)
    };

    var mapOptions = {
        center: defaultLatLng,
        zoom: 3, // The initial zoom level when your map loads (0-20)
        minZoom: 3, // Minimum zoom level allowed (0-20)
        maxZoom: 18, // Maximum soom level allowed (0-20)
        zoomControl:false, // Set to true if using zoomControlOptions below, or false to remove all zoom controls.
        mapTypeId: google.maps.MapTypeId.ROADMAP, // Set the type of Map
        scrollwheel: true, // Enable Mouse Scroll zooming

        // All of the below are set to true by default, so simply remove if set to true:
        panControl:false, // Set to false to disable
        mapTypeControl:false, // Disable Map/Satellite switch
        scaleControl:false, // Set to false to hide scale
        streetViewControl:false, // Set to disable to hide street view
        overviewMapControl:false, // Set to false to remove overview control
        rotateControl:false // Set to false to disable rotate control
    };
    var mapDiv = document.getElementById('map-canvas');
    map = new google.maps.Map(mapDiv, mapOptions);

    navigator.geolocation.getCurrentPosition(onFirstPosition, onPositionError, locationOptions);
}

function setupWatchPosition() {
    if (!watchPosition) {
        watchPosition = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, locationOptions);
    }
}

function onFirstPosition(position){
    userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    initialiseEventBus();
    map.panTo(userLocation);
}

function onPositionUpdate(position) {
    if (markersMap[mySessionId]) { //update user marker position
        userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        var userMarker = markersMap[mySessionId].marker;
        userMarker.setPosition(userLocation);
    }
}

function onPositionError(err) {
    Materialize.toast('User location not available :(', 7000);
    console.error('Error(' + err.code + '): ' + err.message);
}

function createMessage(text){
    return {
        lat:userLocation.lat(),
        lng: userLocation.lng(),
        text: text
    };
}

function displayMessageOnMap(msg){
    var newPosition = new google.maps.LatLng(msg.lat,msg.lng);
    var msgSessionId = msg.sessionId;

    // xss prevention hack
    msg.text = html_sanitize(msg.text);

    msg.text = String(msg.text).replace(/[&<>"'\/卐卍]/g, function (s) {
        return entityMap[s];
    });

    if(markersMap[msgSessionId]){ // update existing marker
        var existingMarker = markersMap[msgSessionId].marker;
        var existingInfoWindow = markersMap[msgSessionId].infoWindow;
        var existingTimeoutId = markersMap[msgSessionId].timeoutId;

        existingMarker.setPosition(newPosition);
        existingInfoWindow.setContent(msg.text);
        if (msg.text) {
             if (existingTimeoutId){
                clearTimeout(existingTimeoutId);
            }
            markersMap[msgSessionId].timeoutId =
                setTimeout(function() { existingInfoWindow.close() }, 15000);
           existingInfoWindow.open(map, existingMarker);
        }
    } else { // new marker
        var infoWindow = new google.maps.InfoWindow({
            content: msg.text,
            maxWidth: 400,
            disableAutoPan: true
        });

        var marker = new google.maps.Marker({
            position: newPosition,
            map: map,
            draggable:true,
            icon: markerImage,
            title: "User "+msgSessionId
        });

        if (msg.text) {
            infoWindow.open(map, marker);
        }

         var timeoutId = setTimeout(function() { infoWindow.close() }, 15000);
       markersMap[msgSessionId] = {
            marker: marker,
            infoWindow: infoWindow
,             timeoutId: timeoutId
       }
    }

    if (advanced){
        runAdvancedOptions(msg);
    }
}

function clearMessageFromMap(){
    for (var markerSessionId in markersMap) {
        if (markersMap.hasOwnProperty(markerSessionId)) {
            markersMap[markerSessionId].infoWindow.close();
        }
    }
}

function runAdvancedOptions(msg){
    if (msg.sessionId == mySessionId){
        return;
    }

    if (Notification.permission !== "granted"){
        Notification.requestPermission();
    }

    new Notification('Incoming MapChat', {
        icon: 'favicons/apple-touch-icon-120x120.png',
        body: msg.text ? "Incoming message: "+msg.text : "New user"
    });
}

// This should be displayed when the app is opened from a mobile facebook app WebView (Until a better solution is found)
if (window.navigator.userAgent.indexOf("FBAV") > 0) {
    document.write(
            "<div class=\"center\" style=\"position: fixed; top: 120px; width: 100%;\">" +
                "<div class=\"\">" +
                    "<h6>" +
                        "This page will not work inside the facebook app, " +
                        "please open it in the native browser." +
                    "</h6>" +
                "</div>" +
            "</div>"
    );
}  else {
    google.maps.event.addDomListener(window, 'load', initialize);
}

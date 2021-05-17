<!DOCTYPE html>
<html>
	<head>
		<title>Page Title</title>
        
	</head>
	<body>
		<iframe id="inlineFrameExample"
            title="Inline Frame Example"
            width="500"
            height="500"
            src="">
        </iframe>
        <button onclick="getLocation()">Show Location</button>
        <p id="demo"></p>
	</body>

    <script>
        var x = document.getElementById("demo");
        var lat = 0;
        var lon = 0;
        var mapsrc = "";
        var watchID = 0;

        function getLocation() {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(showPosition);
        } else { 
            x.innerHTML = "Geolocation is not supported by this browser.";
        }
        }
            
        function showPosition(position) {
            x.innerHTML="Latitude: " + position.coords.latitude + 
            "<br>Longitude: " + position.coords.longitude;

            lat = position.coords.latitude;
            lon = position.coords.longitude;
            console.log(lat + ", " + lon);

            mapsrc = "https://www.mapquest.com/latlng/" + lat + "," + lon + "?zoom=0";

            console.log(mapsrc);
            document.getElementById('inlineFrameExample').setAttribute("src", mapsrc);
            navigator.geolocation.clearWatch(watchID);
        }
    </script>
</html>

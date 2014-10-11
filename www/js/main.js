/* 
 * Copyright (c) 2014 Apocalypse Laboratories.
 * All rights reserved.
 * Do not distribute source code without
 *   express written permission.
 * Website: http://apocalypselabs.net/
 * Contact: admin@apocalypselabs.net
 */

var apiurl = "http://apis.terranquest.net/";

var username = '';
var password = '';

// If something is wrong
var broken = false;

// Equipped item IDs
// default values shown
var weapon = "none";
var magic = "sparks";
var armor = "hoodie";


// Get health stats every 3 seconds.
window.setInterval(getStats, 3000);

// Displayed while waiting for the server to give the actual list data.
var loadingCode = '<li class="list-group-item"><i class="fa fa-spinner fa-spin"></i> <i>Loading...</i></li>';

$('#weaponModal').on('shown.bs.modal', function (e) {
    $('#weaponlist').html(loadingCode);
    getItems('weapon');
});

$('#magicModal').on('shown.bs.modal', function (e) {
    $('#magiclist').html(loadingCode);
    getItems('magic');
});

$('#armorModal').on('shown.bs.modal', function (e) {
    $('#armorlist').html(loadingCode);
    getItems('armor');
});

function gpsError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("This app needs your location to function.  Please enable it.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("Cannot get location.  Reload the page and give permission.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

/**
 * Get the user's location and calls sendPosition() with the data.
 * 
 * @returns nothing.
 */

function getLocation() {
    if (username === '') {
        return;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(sendPosition, gpsError);
    } else {
        disable = true;
        alert("This app will not function without location services.  Please upgrade your browser.");
    }
}

/**
 * Send the user's location to the server, then calls getPositions().
 * 
 * @param position The user's location.
 * @returns nothing
 */
function sendPosition(position) {
    // Accuracy must be better than 10 meters (~33 feet).
    if (position.accuracy < 10) {
        $.get(
                apiurl + "m.php",
                {u: username,
                    lat: position.coords.latitude,
                    long: position.coords.longitude,
                    a: 'setstatus'});
        getPositions(position);
    } else {
        var content = '<li class="list-group-item">Your location isn\'t accurate enough to play this game.</li>';
        content += '<li class="list-group-item">Your accuracy: '+position.accuracy+' meters.</li>';
        content += '<li class="list-group-item">Required accuracy: 10 meters or less.</li>';
        $('#playerlist').html(content);
        $('#targetbox').html("<option>Error.  See player list.</option>");
        $('#attackbtn').prop("disabled", true);
        $('#magicbtn').prop("disabled", true);
        $('#blockbtn').prop("disabled", true);
    }
}

/**
 * Fetch and display the nearby players.
 * 
 * @param position The location data.
 * @returns nothing.
 */
function getPositions(position) {
    $.get(
            apiurl + "m.php",
            {lat: position.coords.latitude,
                long: position.coords.longitude,
                a: 'getnear'},
    function (data) {
        var obj = JSON.parse(data);
        var content = "";
        var targetc = "";
        for (var user in obj) {
            if (user !== username) {
                content += '<li class="list-group-item">' + user + '</li>';
            }
            targetc += '<option>' + user + '</option>';
        }
        $('#attackbtn').prop("disabled", false);
        $('#magicbtn').prop("disabled", false);
        $('#blockbtn').prop("disabled", false);
        if (content === "") {
            content = '<li class="list-group-item">Nobody else in sight...</li>';
            $('#attackbtn').prop("disabled", true);
            $('#blockbtn').prop("disabled", true);
        } else {
            $('#attackbtn').prop("disabled", false);
            $('#blockbtn').prop("disabled", false);
        }
        $('#playerlist').html(content);
        $('#targetbox').html(targetc);
    }
    );
}

/**
 * Fetch and display the items in the user's server inventory.
 * Filters to the category specified.
 * 
 * @param cat The category of items.  Can be "weapon", "armor", or "magic".
 * @returns nothing
 */
function getItems(cat) {
    if (username !== "") {
    $.get(
            apiurl + "inventory.php",
            {a: 'get',
                u: username},
    function (data) {
        var obj = JSON.parse(data);
        var content = "";
        for (var item in obj) {
            if (obj[item]['cat'] === cat) {
                content += '<li class="list-group-item">' + obj[item]['name'] + ' &nbsp; <i>Uses remaining: ' + obj[item]['uses'] + '</i></li>';
            }
        }
        $('#' + cat + 'list').html(content);
    }
    );
    }
}

/**
 * Get the stats for the current user and updates the display.
 * 
 * @returns nothing
 */
function getStats() {
    if (username !== "") {
    $.get(
            apiurl + "stats.php",
            {u: username},
    function (data) {
        var obj = JSON.parse(data);
        var hppercent = (obj['hp'] / obj['maxhp']) * 100;
        var magicpercent = (obj['magic'] / obj['maxmagic']) * 100;

        // Is something screwy?
        if ((obj['hp'] > obj['maxhp']) || (obj['magic'] > obj['maxmagic']) || (obj['level'] < 1)) {
            $.get(apiurl + "fixerr.php", {u: username}, function (data) {
                if (data === '0') {
                    alert("Heads up, some of your player stats had gone bad.  We automagically fixed them though, so no worries!");
                } else {
                    // Only bug user once
                    if (broken === false) {
                        alert("Oh, snap!  Your data is a little messed up.  You need to contact support to fix this.  Email support@aplabs.us and we\'ll get right on it.");
                    }
                    broken = true;
                }
            });
        } else {
            $('#hpbar').css('width', hppercent + '%').attr('aria-valuenow', hppercent);
            $('#hpbar').html(obj['hp'] + '/' + obj['maxhp']);
            $('#magicbar').css('width', magicpercent + '%').attr('aria-valuenow', magicpercent);
            $('#magicbar').html(obj['magic'] + '/' + obj['maxmagic']);
        }
    }
    );
    }
}

function login() {
    $.get(apiurl + "login.php", {donothing: true}, function (junk) {
        var tries = 0;
        var user = prompt("Please enter your username.");
        var pass = prompt("Now give your password.");
        $.post(apiurl + "login.php", {u: user, p: pass},
        function (data) {
            if (data === 'BAD') {
                tries += 1;
                if (tries < 3) {
                    alert("Login incorrect.");
                } else {
                    alert("Login incorrect.  Try logging in online for more details.");
                }
                login();
            } else {
                done = true;
                username = user;
                password = pass;
                if (data === 'NEW') {
                    alert("Welcome to TerranQuest, " + username + "!  Your account has been linked successfully!");
                }
            }
        }
        );
    });
}

$(window).bind("load", function () {
    if (username === "") {
        setTimeout(login, 1000);
    }
    window.setInterval(getLocation, 3000);
    getStats();
    setTimeout(function () {
        $('#overlay').css('display', 'none');
    }, 4000);
});
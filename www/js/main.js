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

var alertspamcount = 0;

// Equipped item IDs
var weapon = null;
var magic = null;

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

$('#resModal').on('shown.bs.modal', function (e) {
    $('#resourceslist').html(loadingCode);
    getItems('resources');
});


/**
 * Show an error for GPS stuff.
 * 
 * Doesn't bother every time, only every 5th error.
 * Otherwise it might spam a lot and make the app unusuable.
 * 
 * @param error The error.
 */
function gpsError(error) {
    if (alertspamcount % 5 === 0) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert("This app needs your location to function.  Please enable it.");
                break;
            case error.POSITION_UNAVAILABLE:
                alert("Location information is unavailable.");
                break;
            case error.TIMEOUT:
                alert("Cannot get location: timeout.");
                break;
            case error.UNKNOWN_ERROR:
                alert("An unknown error occurred.");
                break;
        }
    }
    alertspamcount++;
}

/**
 * Send the user's location to the server, then calls getPositions().
 * 
 * @param position The user's location.
 */
function sendPosition(position) {
    $('#debugging').html("<p>Latitude: " + position.coords.latitude + "<br />Longitude: " + position.coords.longitude + "<br />Accuracy: " + position.coords.accuracy + "</p>");
    // Accuracy must be better than 10 meters (~33 feet).
    if (position.coords.accuracy < 10) {
        $.get(
                apiurl + "m.php",
                {u: username,
                    lat: position.coords.latitude,
                    long: position.coords.longitude,
                    a: 'setstatus'});
        getPositions(position);
    } else {
        var content = '<li class="list-group-item">Your location isn\'t accurate enough to play this game.</li>';
        content += '<li class="list-group-item">Your accuracy: ' + position.coords.accuracy + ' meters.</li>';
        content += '<li class="list-group-item">Required accuracy: 10 meters or less.</li>';
        $('#playerlist').html(content);
        $('#targetbox').html("<option>Waiting for better accuracy...</option>");
        $('#attackbtn').prop("disabled", true);
        $('#magicbtn').prop("disabled", true);
        $('#blockbtn').prop("disabled", true);
    }
}

/**
 * Fetch and display the nearby players.
 * 
 * @param position The location data.
 * @param badlocation TRUE if location not reliable.
 */
function getPositions(position, badlocation) {
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
        $('#magicbtn').prop("disabled", false);
        if (content === "") {
            content = '<li class="list-group-item">Nobody else in sight...</li>';
            $('#attackbtn').prop("disabled", true);
            $('#blockbtn').prop("disabled", true);
        } else {
            $('#attackbtn').prop("disabled", false);
            $('#blockbtn').prop("disabled", false);
        }
        $('#playerlist').html(content);
        if (badlocation === true) {
            $('#attackbtn').prop("disabled", true);
            $('#magicbtn').prop("disabled", true);
            $('#blockbtn').prop("disabled", true);
        } else {
            $('#targetbox').html(targetc);
        }
    }
    );
}

/**
 * Download and display the messages for the user.
 */
function getMsgs() {
    if (loggedIn()) {
        $.get(
                apiurl + "getmsgs.php",
                {u: username},
        function (data) {
            var obj = data.split("\n");
            var content = "";
            var alength = obj.length;
            for (var i = 0; i < alength; i++) {
                if (obj[i] !== '') {
                    content += '<li class="list-group-item">' + obj[i] + '</li>';
                }
            }
            $('#messagelist').html(content);
        }
        );
    }
}

/**
 * Fetch and display the items in the user's server inventory.
 * Filters to the category specified.
 * 
 * @param cat The category of items.  Can be "weapon", "resources", or "magic".
 */
function getItems(cat) {
    if (loggedIn()) {
        $.get(
                apiurl + "inventory.php",
                {a: 'get',
                    u: username,
                    cat: cat},
        function (data) {
            var obj = JSON.parse(data);
            var content = "";
            for (var item in obj) {
                if (obj[item]['cat'] === cat && obj[item]['isLocked'] !== "TRUE") {
                    if (cat === 'resources') {
                        content += '<li class="list-group-item">'
                                + obj[item]['name'] 
                                + ' &nbsp; <i>x' 
                                + obj[item]['uses'] + '</i></li>';
                    } else {
                        content += '<li class="list-group-item">'
                                + '<div class="input-group">'
                                + '<span class="input-group-addon">'
                                + '<input type="radio" class="form-control checklist-text" name="'
                                + cat + '" value="'
                                + item + '" /></span>'
                                + '<div class="form-control checklist-text" >' 
                                + obj[item]['name']
                                + ' &nbsp; <i>Uses remaining: ' 
                                + obj[item]['uses'] + '</i></div></div></li>';
                    }
                }
            }
            if (content === "") {
                content = '<li class="list-group-item">No items found!</li>';
            }
            $('#' + cat + 'list').html(content);
        }
        );
    }
}

/**
 * Equip the selected item from the modal to the given category slot.
 * 
 * @param {String} cat The item category called.
 */
function equipItem(cat) {
    var itemid = $("input:radio[name='"+cat+"']:checked").val();
    switch (cat) {
        case "weapon":
            weapon = itemid;
            break;
        case "magic":
            magic = itemid;
            break;
    }
    alert("Equipped "+itemid+" in category "+cat);
}

/**
 * Get the user's location and calls sendPosition() with the data.
 */
function getLocation() {
    if (!loggedIn()) {
        return;
    }
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(sendPosition,
                gpsError,
                {maximumAge: 30000, timeout: 10000, enableHighAccuracy: true});
    } else {
        disable = true;
        alert("This app will not function without location services.  Please upgrade your browser.");
    }
}

/**
 * Get the stats for the current user and updates the display.
 * If invalid stats are detected, it instead requests the server to 
 * fix the stats.
 */
function getStats() {
    if (loggedIn()) {
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

/**
 * Handle the login procedure.  Gets user/pass from modal and authenticates.
 * Sets cookies on success.
 */
function login() {
    $.get(apiurl + "login.php", {donothing: true}, function (junk) {
        $('#loginerrmsg').css('display', 'none');
        var user = $("#usernamebox").val();
        var pass = $("#passwordbox").val();
        $.post(apiurl + "login.php", {u: user, p: pass},
        function (data) {
            if (data === 'BAD') {
                $('#loginerrmsg').css('display', 'default');
            } else {
                done = true;
                username = user;
                password = pass;
                createCookie('username', username, 15);
                createCookie('password', password, 15);
                $('#loginModal').modal('hide');
            }
        }
        );
    });
}

/**
 * Show the login modal box.
 */
function showLogin() {
    $('#loginModal').modal({
        backdrop: 'static',
        keyboard: false
    });
    $('#loginModal').modal('show');
    $('#overlay').css('display', 'none');
}

/**
 * Create or update a cookie.
 * @param {String} name Cookie name
 * @param {String} value Cookie contents (chocolate chips please)
 * @param {int} days How many days until cookie expires
 */
function createCookie(name, value, days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

/**
 * Read the given cookie name and return the data.
 * 
 * @param {String} name Cookie name.
 * @returns {Object} Data if set, else null.
 */
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ')
            c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
            return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Erase the cookie with the given name.
 * 
 * @param {String} name Cookie name.
 */
function eraseCookie(name) {
    createCookie(name, "", -1);
}

/**
 * If the user isn't logged in, keep bringing up the login box.
 * Prevents from doing things when not logged in, you'd have to be
 * really fast to click through a menu in under a second!
 */
function spamBox() {
    if (!loggedIn()) {
        if (!($('#loginModal').hasClass('in'))) {
            showLogin();
        }
    }
}

/**
 * Checks if the user has logged in to the app.
 * 
 * @returns {Boolean} TRUE if user logged in.
 */
function loggedIn() {
    return !(username === "" || username === null || password === "" || password === null);
}


// Start the app going.
$(window).bind("load", function () {
    username = readCookie("username");
    password = readCookie("password");
    window.setInterval(spamBox, 1000);
    if (!loggedIn()) {
        setTimeout(showLogin, 1000);
    } else {
        setTimeout(function () {
            $('#overlay').css('display', 'none');
        }, 4000);
    }
    window.setInterval(getLocation, 3000);
    window.setInterval(getMsgs, 1000);
    getStats();
});
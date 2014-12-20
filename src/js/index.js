/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

(function() {

// Request path constants
var API_SERVER_PATH    = "/add";
var GETTING_TOKEN_PATH = "/generate";

// include depend classes
//= require PinboardInput.js
//= require Overlay.js
//= require TokenForm.js
//= require Message.js

// Main
window.addEventListener("load", function() {
    var pi = new PinboardInput();

    // Get active tab's url and title
    chrome.tabs.getSelected(null, function(tab) {
        pi.setUrl(tab.url);
        pi.setTitle(tab.title);

        // Did you save settings at localStorage?
        if ( ! localStorage.getItem("pinboard-token") ) {
            pi.showConfiguration(true);

            chrome.tabs.executeScript(null, { "file": "inject.js" }, function(list) {
                if ( list[0] ) {
                    var tf = TokenForm.getInstance();

                    tf.setToken(list[0]);
                }
            });
        } else {
            // A few delay
            setTimeout(function() {
                pi.focus("tags");
            }, 50);
        }
    });
});

})();

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

(function() {

// Request path constants
var API_SERVER_PATH     = "/add";
var API_RSS_SERVER_PATH = "/add_rss";
var GETTING_TOKEN_PATH  = "/generate";

// include depend classes
/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

/**
 * Overlay class
 *
 * @class Overlay
 * @constructor
 */
function Overlay() {
    this.layer = document.querySelector(".overlay");
}

/**
 * Show overlay
 *
 * @method showOverlay
 * @return Void
 */
Overlay.prototype.showOverlay = function() {
    this.layer.classList.remove("hidden");
};

/**
 * Hide overlay
 *
 * @method hideOverlay
 * @return Void
 */
Overlay.prototype.hideOverlay = function() {
    this.layer.classList.add("hidden");
};


// Singleton instance
var TokenFormInstance;

/**
 * Token input manager class
 *
 * @class TokenForm
 * @constructor
 */
function TokenForm() {
    this.form   = null;
    this.input  = null;
    this.save   = null;
    this.info   = null;
    this.error  = null;
    this.locked = false;
    this.hidden = true;

    Overlay.call(this);

    this.initialize();
}

/**
 * Get singleton instance
 *
 * @method getInstance
 * @public static
 * @return TokenForm TokenFormInstance
 */
TokenForm.getInstance = function() {
    if ( ! TokenFormInstance ) {
        TokenFormInstance = new TokenForm();
    }

    return TokenFormInstance;
};

/**
 * Check form is hidden
 *
 * @method isHidden
 * @public static
 * @return Bool
 */
TokenForm.isHidden = function() {
    return TokenForm.getInstance().hidden;
};

// extend
TokenForm.prototype = new Overlay();

/**
 * Initialize
 *
 * @method initialize
 * @private
 * @return Void
 */
TokenForm.prototype.initialize = function() {
    this.form  = document.querySelector(".pb-settingform");
    this.token = this.form.querySelector(".pb-tokeninput");
    this.host  = this.form.querySelector(".pb-hostinput");
    this.save  = this.form.querySelector(".pb-tokensave");
    this.info  = this.form.querySelector(".pb-tokeninfo");

    this.tokenError = this.form.querySelector(".pb-tokenerror");
    this.hostError  = this.form.querySelector(".pb-hosterror");

    this.save.addEventListener("click", this);
    this.info.querySelector("a").addEventListener("click", function(evt) {
        evt.preventDefault();

        chrome.tabs.create({url: HELP_PAGE_URL});
    });
};

/**
 * Set setting values
 *
 * @method setToken
 * @public
 * @param Object setting
 * @return Void
 */
TokenForm.prototype.setToken = function(setting) {
    this.host.value  = ( ! ("requestHost" in setting) || setting.requestHost === null ) ? "" : setting.requestHost;
    this.token.value = ( ! ("token"       in setting) || setting.token       === null ) ? "" : setting.token;
};

/**
 * Show form
 *
 * @method show
 * @public
 * @return Void
 */
TokenForm.prototype.show = function(lock) {
    this.showOverlay();
    this.form.classList.remove("hidden");
    this.hostError.classList.add("hidden");
    this.tokenError.classList.add("hidden");

    this.locked = !!lock;
    this.hidden = false;
};

/**
 * Hide form
 *
 * @method hide
 * @public
 * @return Void
 */
TokenForm.prototype.hide = function() {
    this.hideOverlay();
    this.form.classList.add("hidden");

    this.hidden = true;
};

/**
 * Check form is locked
 *
 * @method isLocked
 * @public
 * @return Book
 */
TokenForm.prototype.isLocked = function() {
    return this.locked;
};

/**
 * Event handler
 *
 * @method handleEvent
 * @public
 * @param Event evt
 * @return Void
 */
TokenForm.prototype.handleEvent = function(evt) {
    evt.preventDefault();

    var token  = this.token.value,
        host   = this.host.value,
        errors = [],
        promise;

    // validate
    if ( token === "" ) {
        errors.push(function() {
            this.tokenError.textContent = "Token must not empty!";
            this.tokenError.classList.remove("hidden");
        }.bind(this));
    }
    if ( host === "" ) {
        errors.push(function() {
            this.hostError.textContent = "Host must not empty!";
            this.hostError.classList.remove("hidden");
        }.bind(this));
    } else if ( ! /^https?:\/\/[\w\-\._]+(?:\:[0-9]+)?$/.test(host) ) {
        errors.push(function() {
            this.hostError.textContent = "Host must be URL format!";
            this.hostError.classList.remove("hidden");
        }.bind(this));
    }

    if ( errors.length > 0 ) {
        errors.forEach(function(error) {
            error();
        })
        return;
    }

    // Check accept request ( async )
    promise = new Promise(this.acceptRequest(host, token));
    promise.then(function(json) {
        var message;

        this.tokenError.classList.add("hidden");
        this.hostError.classList.add("hidden");
        localStorage.setItem("pinboard-token", JSON.stringify({
            requestHost: host,
            token: token
        }));

        this.hide();
        message = new Message("Welcome, " + json.message + "!");
        message.show(2000);
    }.bind(this), function(reason) {
        this.hostError.textContent = reason.host;
        this.hostError.classList.remove("hidden");
        this.tokenError.textContent = reason.token;
        this.tokenError.classList.remove("hidden");
    }.bind(this));
};

/**
 * Send to your server for accept
 *
 * @method acceptRequest
 * @private
 * @param String host
 * @param String token
 * @return Function(Promise.resolve, Promise.reject)
 */
TokenForm.prototype.acceptRequest = function(host, token) {
    return function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.onload = function() {
            if ( xhr.status === 200 ) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject({
                    host: "",
                    token: "Token not authorized"
                });
            }
        };
        xhr.onerror = function() {
            var reason = {
                host: "",
                token: ""
            };

            if ( xhr.status === 404 ) {
                reason.host = "Host not found";
            } else {
                reason.token = "Token not authorized";
            }

            reject(reason);
        };

        xhr.open("GET", host + "/accept", true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-LAP-Token", token);
        xhr.send(null);
    };
};

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

function TagControl(input) {
    this.tagWrapper    = document.querySelector(".tag-wrapper");
    this.tagInput      = input;
    this.tagElement    = document.createElement("span");
    this.tagList       = {};
    this.isComposition = false;

    this.initialize();
}

TagControl.prototype.initialize = function() {
    var removeElement = document.createElement("a");

    this.tagInput.addEventListener("compositionstart", this);
    this.tagInput.addEventListener("compositionend",   this);
    this.tagInput.addEventListener("keyup",            this);

    this.tagWrapper.addEventListener("click", this);

    this.tagElement.className = "tag";
    removeElement.className   = "remove";

    this.tagElement.appendChild(removeElement);
};

TagControl.prototype.handleEvent = function(evt) {
    switch ( evt.type ) {
        case "keyup":
            this.handleKeyUp(evt);
            break;
        case "click":
            this.handleTagClick(evt);
            break;
        case "compositionstart":
            this.isComposition = true;
            break;
        case "compositionend":
            this.isComposition = false;
            break;
    }
};

TagControl.prototype.handleKeyUp = function(evt) {
    if ( evt.keyCode !== 32 || this.isComposition === true ) { // space key
        return;
    }
    var value = this.tagInput.value;

    // skip if empty input
    if ( value !== "" && value !== " " && ! this.checkExists(value) ) {
        this.createTag(value.trim());
    }

    this.tagInput.value = "";
    this.tagInput.focus();
};

TagControl.prototype.handleTagClick = function(evt) {
    var tag,
        tagName;

    if ( ! evt.target.matches(".remove") ) {
        return;
    }

    tag = evt.target.parentNode;
    tagName = tag.firstChild.nodeValue;
    tag.parentNode.removeChild(tag);

    if ( tagName in this.tagList ) {
        delete this.tagList[tagName];
    }
};

TagControl.prototype.createTag = function(text) {
    var span = this.tagElement.cloneNode(true);

    span.insertBefore(document.createTextNode(text), span.firstChild);

    this.tagWrapper.appendChild(span);
    this.tagList[text] = 1;
};

TagControl.prototype.checkExists = function(text) {
    return ( text in this.tagList );
}

TagControl.prototype.getTagList = function() {
    return Object.keys(this.tagList);
};




/**
 * Pin data input manager class
 *
 * @class PinboardInput
 * @constructor
 */
function PinboardInput(form) {
    this.form         = form;
    this.registBtn    = null;
    this.config       = null;
    this.tagControl   = null;

    this.initialize();
}

/**
 * Initialize
 *
 * @method initialize
 * @private
 * @return Void
 */
PinboardInput.prototype.initialize = function() {
    this.registBtn  = this.form.querySelector(".pb-submitbtn");
    this.config     = document.querySelector(".pb-configuration");
    this.tagControl = new TagControl(this.form.querySelector("[name=tags]"));

    this.registBtn.addEventListener("click", this);
    this.config.addEventListener("click", this);
};

/**
 * Event handler
 *
 * @method handleEvent
 * @public
 * @param Event evt
 * @return Void
 */
PinboardInput.prototype.handleEvent = function(evt) {
    evt.preventDefault();

    switch ( evt.currentTarget ) {
        case this.registBtn:
            // pushed regist button
            this.sendPinData();
            break;
        case this.config:
            evt.preventDefault();
            this.toggleConfig();
            break;
    }
};

/**
 * Toggle config
 *
 * @method toggleConfig
 * @public
 * @return Void
 */
PinboardInput.prototype.toggleConfig = function() {
    ( TokenForm.isHidden() ) ? this.showConfiguration() : this.hideConfiguration();
};

/**
 * URL value setter
 *
 * @method setUrl
 * @public
 * @param String url
 * @return Void
 */
PinboardInput.prototype.setUrl = function(url) {
    this.form.querySelector("[name=url]").value = url;
};

/**
 * Title value setter
 *
 * @method setTitle
 * @public
 * @param String title
 * @return Void
 */
PinboardInput.prototype.setTitle = function(title) {
    this.form.querySelector("[name=title]").value = title;
};

/**
 * Focus element
 *
 * @method focus
 * @public
 * @param String name
 * @return Void
 */
PinboardInput.prototype.focus = function(name) {
    this.form.querySelector("[name=" + name + "]").focus();
};

/**
 * Show config window
 *
 * @method showConfiguration
 * @public
 * @param Boolean lock
 * @return Void
 */
PinboardInput.prototype.showConfiguration = function(lock) {
    var tf = TokenForm.getInstance(),
        v  = localStorage.getItem("pinboard-token"),
        json;

    try {
        json = JSON.parse(v);
        tf.setToken(json);
        tf.show(lock);
    } catch ( e ) {
        tf.setToken({requestHost: "", token: ""});
        tf.show(lock);
    }

};

/**
 * Hide config window
 *
 * @method hideConfiguration
 * @public
 * @return Void
 */
PinboardInput.prototype.hideConfiguration = function() {
    var tf = TokenForm.getInstance();

    if ( tf.isLocked() ) {
        return;
    }

    tf.hide();
};

/**
 * Send pin data to server
 *
 * @method sendPinData
 * @public
 * @return Void
 */
PinboardInput.prototype.sendPinData = function() {
    var nodes    = this.form.querySelectorAll("input[type=text], textarea"),
        postData = [],
        config   = JSON.parse(localStorage.getItem("pinboard-token")),
        xhr      = new XMLHttpRequest(),
        loading  = new Message("Sending pin data...");

    [].forEach.call(nodes, function(node) {
        if ( node.name === "tags" ) {
            return;
        }
        postData.push(encodeURIComponent(node.name) + "=" + encodeURIComponent(node.value));
    });

    this.tagControl.getTagList().forEach(function(tag) {
        postData.push("tag=" + encodeURIComponent(tag));
    });

    xhr.onload = function() {
        var isError = ( xhr.status !== 200 ) ? true : false;

        this.handleResponse(xhr.responseText, loading, isError);
    }.bind(this);

    xhr.onerror = function() {
        if ( xhr.status === 0 ) {
            // Server inactive
            this.handleResponse("Server undefined. Does server start?", loading, true);
        } else {
            this.handleResponse(xhr.responseText, loading, true);
        }
    }.bind(this);

    // loading
    loading.setLoading(true);
    loading.show();

    xhr.open("POST", config.requestHost + API_SERVER_PATH, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("X-LAP-Token", config.token);
    xhr.send(postData.join("&"));
};

/**
 * Try to parse message
 *
 * @method parseMessage
 * @private
 * @param String message
 * @return Object
 */
PinboardInput.prototype.parseMessage = function(message) {
    var json;

    try {
        json = JSON.parse(message);
    } catch ( e ) {
        console.log("JSON Parse error: %s", message);
        json = {
            message: message
        };
    }

    return json;
};

/**
 * Handle response
 *
 * @method handleSuccessResponse
 * @public
 * @param String response
 * @param Message loading
 * @param Boolean isError
 * @return Void
 */
PinboardInput.prototype.handleResponse = function(response, loading, isError) {
    var json     = this.parseMessage(response),
        message  = new Message(json.message, isError),
        duration = ( isError ) ? 2000 : 1600,
        setting;

    loading.hide();
    message.show(duration, !isError);

    if ( "categories" in json ) {
        setting = JSON.parse(localStorage.getItem("pinboard-token"));
        setting.categories = json.categories;
        localStorage.setItem(JSON.stringify(setting));
    }
};

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

/**
 * Rss input manager class
 *
 * @class PinboardRss
 * @constructor
 */
function PinboardRss(form) {
    this.form      = form;
    this.add       = null;
    this.category  = null;
    this.registBtn = null;

    this.initialize();
}

/**
 * Initialize
 *
 * @method initialize
 * @private
 * @return Void
 */
PinboardRss.prototype.initialize = function() {
    this.registBtn = this.form.querySelector(".pb-submitbtn");
    this.category  = this.form.querySelector("[name=category]");
    this.add       = this.form.querySelector(".pb-add");

    this.registBtn.addEventListener("click", this);
    this.add.addEventListener("click", this);

    this.refreshCategory();
}

/**
 * Refresh category
 *
 * @method refreshCategory
 * @public
 * @return Void
 */
PinboardRss.prototype.refreshCategory = function() {
    try {
        var setting  = JSON.parse(localStorage.getItem("pinboard-token")),
            category = JSON.parse(setting.categories) || [];

        // first cleanup
        while ( this.category.firstChild ) {
            this.category.removeChild(this.category.firstChild);
        }

        // second add
        category.forEach(function(cat) {
            var o = document.createElement("option");

            o.value = cat.id;
            o.appendChild(document.createTextNode(cat.name));

            this.category.appendChild(o);
        }.bind(this));

    } catch ( e ) {
        console.log(e.message);
    }
};

/**
 * Event handler
 *
 * @method handleEvent
 * @public
 * @param Event evt
 * @return Void
 */
PinboardRss.prototype.handleEvent = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    switch ( evt.currentTarget ) {
        case this.registBtn:
            // pushed regist button
            this.sendRssData();
            break;
        case this.add:
            // pushed add button
            this.addCategory();
            break;
    }
};

/**
 * URL value setter
 *
 * @method setUrl
 * @public
 * @param String url
 * @return Void
 */
PinboardRss.prototype.setUrl = function(url) {
    this.form.querySelector("[name=url]").value = url;
};

/**
 * Title value setter
 *
 * @method setTitle
 * @public
 * @param String title
 * @return Void
 */
PinboardRss.prototype.setTitle = function(title) {
    this.form.querySelector("[name=title]").value = title;
};

/**
 * Focus element
 *
 * @method focus
 * @public
 * @param String name
 * @return Void
 */
PinboardRss.prototype.focus = function(name) {
    this.form.querySelector("[name=" + name + "]").focus();
};

/**
 * Add new category
 *
 * @method addCategory
 * @public
 * @return Void
 */
PinboardRss.prototype.addCategory = function() {
    var cf = CategoryForm.getInstance();

    cf.show();
    cf.onAdded = this.refreshCategory.bind(this);
};

/**
 * Send rss data to server
 *
 * @method sendRssData
 * @public
 * @return Void
 */
PinboardRss.prototype.sendRssData = function() {
    var nodes    = this.form.querySelectorAll("input[type=text], select"),
        postData = [],
        config   = JSON.parse(localStorage.getItem("pinboard-token")),
        xhr      = new XMLHttpRequest(),
        loading  = new Message("Sending RSS data..."),
        errors   = [];

    [].forEach.call(nodes, function(node) {
        if ( node.value === "" ) {
            errors.push(function() {
                var span = document.createElement("span");

                span.classList.add("pb-inputerror");
                span.appendChild(document.createTextNode(node.name + " must not be empty!"));

                node.parentNode.appendChild(span);
            });
        }
        postData.push(encodeURIComponent(node.name) + "=" + encodeURIComponent(node.value));
    });

    if ( errors.length > 0 ) {
        errors.forEach(function(fn) {
            fn();
        });
        return;
    } else {
        [].forEach.call(this.form.querySelectorAll(".pb-tokenerror"), function(element) {
            element.parentNode.removeChild(element);
        });
    }

    xhr.onload = function() {
        var isError = ( xhr.status !== 200 ) ? true : false;

        this.handleResponse(xhr.responseText, loading, isError);
    }.bind(this);

    xhr.onerror = function() {
        if ( xhr.status === 0 ) {
            // Server inactive
            this.handleResponse("Server undefined. Does server start?", loading, true);
        } else {
            this.handleResponse(xhr.responseText, loading, true);
        }
    }.bind(this);

    // loading
    loading.setLoading(true);
    loading.show();

    xhr.open("POST", config.requestHost + API_RSS_SERVER_PATH, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("X-LAP-Token", config.token);
    xhr.send(postData.join("&"));
};

/**
 * Try to parse message
 *
 * @method parseMessage
 * @private
 * @param String message
 * @return Object
 */
PinboardRss.prototype.parseMessage = function(message) {
    var json;

    try {
        json = JSON.parse(message);
    } catch ( e ) {
        console.log("JSON Parse error: %s", message);
        json = {
            message: message
        };
    }

    return json;
};

/**
 * Handle response
 *
 * @method handleSuccessResponse
 * @public
 * @param String response
 * @param Message loading
 * @param Boolean isError
 * @return Void
 */
PinboardRss.prototype.handleResponse = function(response, loading, isError) {
    var json     = this.parseMessage(response),
        message  = new Message(json.message, isError),
        duration = ( isError ) ? 2000 : 1600;

    loading.hide();
    message.show(duration, !isError);

    if ( "categories" in json ) {
        setting = JSON.parse(localStorage.getItem("pinboard-token"));
        setting.categories = json.categories;
        localStorage.setItem(JSON.stringify(setting));
    }
};

undefined
undefined
/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

undefined

// Singleton instance
var CategoryFormInstance;

/**
 * Category input manager class
 *
 * @class CategoryForm
 * @constructor
 */
function CategoryForm() {
    this.form     = null;
    this.category = null;
    this.save     = null;
    this.error    = null;
    this.hidden   = true;
    this.onAdded  = null;

    Overlay.call(this);

    this.initialize();
}

/**
 * Get singleton instance
 *
 * @method getInstance
 * @public static
 * @return CategoryForm CategoryFormInstance
 */
CategoryForm.getInstance = function() {
    if ( ! CategoryFormInstance ) {
        CategoryFormInstance = new CategoryForm();
    }

    return CategoryFormInstance;
};

/**
 * Check form is hidden
 *
 * @method isHidden
 * @public static
 * @return Bool
 */
CategoryForm.isHidden = function() {
    return CategoryForm.getInstance().hidden;
};

// extend
CategoryForm.prototype = new Overlay();

/**
 * Initialize
 *
 * @method initialize
 * @private
 * @return Void
 */
CategoryForm.prototype.initialize = function() {
    this.form     = document.querySelector(".category");
    this.category = this.form.querySelector(".pb-categoryinput");
    this.save     = this.form.querySelector(".pb-categorysave");
    this.close    = this.form.querySelector(".pb-close");

    this.categoryError = this.form.querySelector(".pb-categoryerror");

    this.save.addEventListener("click", this);
    this.close.addEventListener("click", function() {
        this.hide();
    }.bind(this));

    console.log(this);
};

/**
 * Show form
 *
 * @method show
 * @public
 * @return Void
 */
CategoryForm.prototype.show = function(lock) {
    this.showOverlay();
    this.form.classList.remove("hidden");
    this.categoryError.classList.add("hidden");
    this.category.focus();

    this.hidden = false;
};

/**
 * Hide form
 *
 * @method hide
 * @public
 * @return Void
 */
CategoryForm.prototype.hide = function() {
    this.hideOverlay();
    this.form.classList.add("hidden");

    this.hidden = true;
};

/**
 * Event handler
 *
 * @method handleEvent
 * @public
 * @param Event evt
 * @return Void
 */
CategoryForm.prototype.handleEvent = function(evt) {
    evt.preventDefault();

    var category = this.category.value,
        errors   = [],
        promise;

    // validate
    if ( category === "" ) {
        errors.push(function() {
            this.categoryError.textContent = "Category must not empty!";
            this.categoryError.classList.remove("hidden");
        }.bind(this));
    }

    if ( errors.length > 0 ) {
        errors.forEach(function(error) {
            error();
        })
        return;
    }

    // Check accept request ( async )
    promise = new Promise(this.addRequest(category));
    promise.then(function(json) {
        var message,
            setting;

        this.categoryError.classList.add("hidden");
        setting = JSON.parse(localStorage.getItem("pinboard-token"));
        setting.categories = json.message;

        localStorage.setItem("pinboard-token", JSON.stringify(setting));
        this.onAdded && this.onAdded();

        this.hide();
        message = new Message("Category Added!");
        message.show(1600);
    }.bind(this), function(reason) {
        this.categoryError.textContent = reason.category;
        this.categoryError.classList.remove("hidden");
    }.bind(this));
};

/**
 * Send to your server for accept
 *
 * @method addRequest
 * @private
 * @param String category
 * @return Function(Promise.resolve, Promise.reject)
 */
CategoryForm.prototype.addRequest = function(category) {
    return function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.onload = function() {
            if ( xhr.status === 200 ) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                var json = JSON.parse(xhr.responseText);
                reject({
                    category: ( json.message.indexOf("Duplicate entry") !== -1 ) ? "Category is duplicated!" : json.message
                });
            }
        };
        xhr.onerror = function() {
            var reason = {
                category: ""
            };

            if ( xhr.status === 404 ) {
                reason.category = "API Server not found";
            } else {
                reason.category = "Unexpected Error";
            }

            reject(reason);
        };

        var setting = JSON.parse(localStorage.getItem("pinboard-token"));

        xhr.open("POST", setting.requestHost + "/add_rss_category", true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-LAP-Token", setting.token);
        xhr.send("category=" + encodeURIComponent(category));
    };
};

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

undefined

/**
 * Message manager class
 *
 * @class Message
 * @constructor
 * @param String message
 * @param Boolean isError
 */
function Message(message, isError) {
    this.message     = message;
    this.isError     = !!isError;
    this.frame       = null;
    this.loading     = null;
    this.showLoading = false;
    this.timer       = null;

    Overlay.call(this);

    this.initialize();
}

// extend
Message.prototype = new Overlay();

/**
 * Initialize
 *
 * @method initialize
 * @private
 * @return Void
 */
Message.prototype.initialize = function() {
    this.frame   = document.querySelector(".pb-message");
    this.loading = this.frame.querySelector("p");

    this.loading.textContent = this.message;
};

/**
 * Set loading flag
 *
 * @method setLoading
 * @public
 * @return Void
 */
Message.prototype.setLoading = function(flag) {
    this.showLoading = !!flag;
};

/**
 * Show message
 *
 * @method show
 * @public
 * @param Number duration
 * @param Boolean afterWindowClose
 * @return
 */
Message.prototype.show = function(duration, afterWindowClose) {
    var that = this;

    this.showOverlay();
    if ( this.showLoading === true ) {
        this.loading.classList.add("loading");
    } else {
        this.loading.classList.remove("loading");
    }

    if ( this.isError === true ) {
        this.loading.classList.add("errormessage");
    }

    this.frame.classList.remove("hidden");
    if ( typeof duration === "number" ) {
        this.timer = setTimeout(function() {
            that.hide(!!afterWindowClose);
        }, duration);
    }
};

/**
 * Hide message
 *
 * @method hide
 * @public
 * @param Boolean closeWindow
 * @return
 */
Message.prototype.hide = function(closeWindow) {
    this.hideOverlay();
    this.frame.classList.add("hidden");

    if ( closeWindow === true ) {
        window.close();
    }
};

/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

/**
 * Tab manager class
 *
 * @class Tab
 * @constructor
 */
function Tab() {
    this.tabs     = {};
    this.contents = {};

    this.activeTab     = null;
    this.activeContent = null;

    this.initialize();
}

Tab.ACTIVE_CLASS = "active";
Tab.HIDDEN_CLASS = "hidden";

Tab.prototype.initialize = function() {
    var current;

    [].forEach.call(document.querySelectorAll("[data-tab]"), function(element) {
        var id = element.getAttribute("data-tab");

        if ( element.classList.contains(Tab.ACTIVE_CLASS) ) {
            current = id;
            this.activeTab = element;
        }

        this.tabs[id] = element;
        element.addEventListener("click", this);
    }.bind(this));

    [].forEach.call(document.querySelectorAll("[data-tabcontent]"), function(element) {
        var id = element.getAttribute("data-tabcontent");

        if ( id === current ) {
            this.activeContent = element;
        }

        this.contents[id] = element;
    }.bind(this));
};

Tab.prototype.handleEvent = function(evt) {
    var id = evt.target.getAttribute("data-tab");

    this.switchTab(id);
};

Tab.prototype.switchTab = function(id) {
    if ( ! id || ! ( id in this.tabs ) ) {
        return;
    }

    if ( this.activeTab ) {
        this.activeTab.classList.remove(Tab.ACTIVE_CLASS);
    }
    if ( this.activeContent ) {
        this.activeContent.classList.add(Tab.HIDDEN_CLASS);
    }

    this.activeTab     = this.tabs[id];
    this.activeContent = this.contents[id];

    this.activeTab.classList.add(Tab.ACTIVE_CLASS);
    this.activeContent.classList.remove(Tab.HIDDEN_CLASS);
};


// Main
window.addEventListener("load", function() {
    var forms = document.getElementsByTagName("form");
    var pi  = new PinboardInput(forms[0]);
    var rss = new PinboardRss(forms[1]);
    var tab = new Tab();

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

        // Get Rss link in current page
        chrome.tabs.executeScript(null, { "file": "inject_rss.js" }, function(list) {
            if ( list[0] ) {
                rss.setUrl(list[0].url);
                rss.setTitle(list[0].title);
            }
        });
    });
});

})();

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
    var nodes    = this.form.querySelectorAll("input[type=text]"),
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

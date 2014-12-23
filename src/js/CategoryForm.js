/**
 * Like a pinboard Chrome Extension
 *
 * @author Yoshiaki Sugimoto <sugimoto@wnotes.net>
 * @License MIT
 * @copyright Yoshiaki Sugimoto all rights reserved.
 */

//= require Overlay.js

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

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

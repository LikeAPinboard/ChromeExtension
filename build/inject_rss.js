var __r = document.querySelectorAll("link[rel=alternate]");
if ( __r.length > 0 ) {
    var __o;
    [].forEach.call(__r, function(element) {
        if ( /^application\/rss/.test(element.getAttribute("type")) ) {
            __o = {
                "url": element.href,
                "title": element.title || ""
            }
        }
    });

    __o && __o;
}

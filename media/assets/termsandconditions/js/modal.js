function termsandconditions_overlay() {
    var el = document.getElementsByClassName("termsandconditions-modal");
    var i;
    for (i = 0; i < el.length; i++) {
        el[i].style.visibility = (el[i].style.visibility == "visible") ? "hidden" : "visible";
    };
};

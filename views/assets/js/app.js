// Track number of open subtask text field
var toShow = 1;

/**
 * showOne
 * shows one more subtask field in the form
 */

function showOne() {
    if(toShow < 5){
    $("#subtask"+toShow).removeClass("hide");
    //currentBox.removeClass("hide");
    toShow += 1;
    }
}

function removeOne() {
    if(toShow > 1){
    $("#subtask"+ ( toShow - 1 )).addClass("hide");
    toShow -= 1;
    }
}


$(document).ready(function () {
    $('.modal-trigger').leanModal();
})



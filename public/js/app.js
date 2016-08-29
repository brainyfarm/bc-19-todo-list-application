
$(document).ready(function () {
    /**
     * Handling modal use and reuse
     */
    $('.modal-trigger').leanModal()
    $('.task-modal-trigger').leanModal({
        ready: function() {
            $('#taskModal h5').text('Add new Task');
            $('#taskModal form').attr('action', `${document.location.pathname}/task`);
        }
    });
})

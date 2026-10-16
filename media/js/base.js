$('table').on('mouseenter', 'tr:gt(0)', function() {
    $(this).addClass('hl').find('.op-icon, .op').removeClass('vh');
})
.on('mouseleave', 'tr:gt(0)', function() {
    $(this).removeClass('hl').find('.op-icon, .op').addClass('vh');
})
.on('focus', 'tr:gt(0) *', function(e) {
    $('tr.hl').removeClass('hl').find('.op-icon, .op').addClass('vh');

    var $tr = $(e.target).closest('tr');
    $tr.addClass('hl').find('.op-icon, .op').removeClass('vh');
});

// clear repo enc info when log out
$('#logout').on('click', function() {
    if ('localStorage' in window && window['localStorage'] !== null) {
        if (localStorage.length > 0) {
            for (var key in localStorage) {
                if (key.lastIndexOf('_decrypt_t') == 36 ||
                    key.lastIndexOf('_enc_key') == 36 ||
                    key.lastIndexOf('_enc_iv') == 36) { // key: {{repo_id}}_xx
                    localStorage.removeItem(key);
                }
            }
        }
    }
});

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function prepareCSRFToken(xhr, settings) {
    if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
        // Only send the token to relative URLs i.e. locally.
        xhr.setRequestHeader("X-CSRFToken", getCookie(SEAFILE_GLOBAL.csrfCookieName));
    }
}

// show feedback
function feedback(con, type, time) {
    time = time || 5000;
    var $el;
    var hide_pos_top,
        show_pos_top = '15px';
    if ($('.messages').length > 0) {
        $el = $('.messages').html('<li class="' + type + '">' + HTMLescape(con) + '</li>');
    } else {
        $el = $('<ul class="messages"><li class="' + type + '">' + HTMLescape(con) + '</li></ul>');
        $('#main').append($el);
    }

    hide_pos_top = '-' + ($el.outerHeight() + parseInt(show_pos_top)) + 'px';

    // add transition: from 'hide' to 'show'. the transition effect is offered by CSS.
    $el.css({'left':($(window).width() - $el.width())/2, 'top': hide_pos_top});
    setTimeout(function() { $el.css({'top': show_pos_top}); }, 10);

    setTimeout(function() { $el.css({'top': hide_pos_top}); }, time);
}

// handle existing messages (in base.html)
(function() {
    var $el;
    var hide_pos_top,
        show_pos_top = '15px';
    if ($('.messages').length > 0) {
        $el = $('.messages');

        hide_pos_top = '-' + ($el.outerHeight() + parseInt(show_pos_top)) + 'px';

        // add transition: from 'hide' to 'show'. the transition effect is offered by CSS.
        $el.css({'left':($(window).width() - $el.width())/2, 'top': hide_pos_top}).removeClass('hide');
        setTimeout(function() { $el.css({'top': show_pos_top}); }, 10);

        setTimeout(function() { $el.css({'top': hide_pos_top}); }, 5000);
    }
})();

function disable(btn) {
    btn.prop('disabled', true).addClass('btn-disabled');
}
function enable(btn) {
    btn.prop('disabled', false).removeClass('btn-disabled');
}

function HTMLescape(html){
    return document.createElement('div')
        .appendChild(document.createTextNode(html))
        .parentNode
        .innerHTML;
}

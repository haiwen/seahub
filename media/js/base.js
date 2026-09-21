$('table').on('mouseenter', 'tr:gt(0)', function() {
    if (app.ui.currentDropDown || app.ui.freezeItemHightlight) {
        return;
    }

    app.ui.currentHightlightedItem = this;
    $(this).addClass('hl').find('.op-icon, .op').removeClass('vh');
})
.on('mouseleave', 'tr:gt(0)', function() {
    if (app.ui.currentDropDown || app.ui.freezeItemHightlight) {
        return;
    }
    app.ui.currentHightlightedItem = null;
    $(this).removeClass('hl').find('.op-icon, .op').addClass('vh');
})
.on('focus', 'tr:gt(0) *', function(e) {
    if (app.ui.currentDropDown || app.ui.freezeItemHightlight) {
        return true;
    }

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

/*
 * add confirm to an operation, using a popup
 * e.g: <button data-url="" data-target="">xxx</button>
 * e.g: addConfirmTo($('.user-del'), {'title': 'Delete user', 'con':'Really del user %s ?'});
 */
function addConfirmTo(op_ele, popup) {
    op_ele.on('click', function() {
        var con = '';
        if ($(this).data('target') && popup['con'].indexOf('%s') != -1) {
            con = popup['con'].replace('%s', '<span class="op-target ellipsis ellipsis-op-target">' + HTMLescape($(this).data('target')) + '</span>');
        } else {
            con = popup['con'];
        }
        $('#confirm-con').html('<h3>' + popup['title'] + '</h3><p>' + con + '</p>');
        $('#confirm-popup').modal({appendTo:'#main'});
        $('#simplemodal-container').css({'width': 'auto', 'height':'auto'});
        $('#confirm-yes').data('url', $(this).data('url')).on('click', function() {
            if (popup.post) { // use form post
                $('<form>', {
                    "method": 'POST',
                    "action": $(this).data('url'),
                    "html": '<input name="csrfmiddlewaretoken" value="' + getCookie(SEAFILE_GLOBAL.csrfCookieName) + '" type="hidden">'
                }).appendTo(document.body).trigger('submit');
            } else { // default
                location.href = $(this).data('url');
            }
        });
        return false;//in case op_ele is '<a>'
    });
}

function showConfirm(title, content, yesCallback) {
    var $popup = $("#confirm-popup");
    var $cont = $('#confirm-con');
    var $yesBtn = $('#confirm-yes');

    $cont.html('<h3>' + title + '</h3><p>' + content + '</p>');
    $popup.modal({appendTo: '#main'});
    $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

    $yesBtn.on('click', yesCallback);
}

function addFormPost(op_ele) {
    op_ele.on('click', function() {
        $('<form>', {
            "method": 'POST',
            "action": $(this).data('url'),
            "html": '<input name="csrfmiddlewaretoken" value="' + getCookie(SEAFILE_GLOBAL.csrfCookieName) + '" type="hidden">'
        }).appendTo(document.body).trigger('submit');
        return false;
    });
}

function getCaretPos(inputor) {
    var end, endRange, len, normalizedValue, pos, range, start, textInputRange;
    if (document.selection) {
        range = document.selection.createRange();
        pos = 0;
        if (range && range.parentElement() === inputor) {
            normalizedValue = inputor.value.replace(/\r\n/g, "\n");
            len = normalizedValue.length;
            textInputRange = inputor.createTextRange();
            textInputRange.moveToBookmark(range.getBookmark());
            endRange = inputor.createTextRange();
            endRange.collapse(false);
            if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                start = end = len;
            } else {
                start = -textInputRange.moveStart("character", -len);
                end = -textInputRange.moveEnd("character", -len);
            }
        }
    } else {
        start = inputor.selectionStart;
    }
    return start;
}

function setCaretPos(inputor, pos) {
    var range;
    if (document.selection) {
        range = inputor.createTextRange();
        range.move("character", pos);
        return range.select();
    } else {
        return inputor.setSelectionRange(pos, pos);
    }
}

function filesizeformat(bytes, precision) {
    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;

    var precision = precision || 0;

    if ((bytes >= 0) && (bytes < kilobyte)) {
        return bytes + ' B';

    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        return (bytes / kilobyte).toFixed(precision) + ' KB';

    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
        return (bytes / megabyte).toFixed(precision) + ' MB';

    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
        return (bytes / gigabyte).toFixed(precision) + ' GB';

    } else if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + ' TB';

    } else {
        return bytes + ' B';
    }
}

function e(str) {
    return encodeURIComponent(str);
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
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

function apply_form_error(formid, error_msg) {
    $("#" + formid + " .error").html(error_msg).removeClass('hide');
    $("#simplemodal-container").css({'height':'auto'});
}

// show feedback
function feedback(con, type, time) {
    var time = time || 5000;
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

// for browsers don't support array.indexOf
if (!Array.indexOf) {
    Array.prototype.indexOf = function(obj){
        for(var i = 0; i < this.length; i++){
            if(this[i] == obj){
                return i;
            }
        }
        return -1;
    }
}

function trimFilename(name, n) {
    var len = name.length;
    var ext = '';
    var str = '';
    if (len > n) {
        if (name.lastIndexOf('.') != -1) { // with extension
            ext = name.split('.').reverse()[0];
            str = name.substr(0, n - ext.length - 3) + '...' + name.substr(name.lastIndexOf('.') - 2);
        } else {
            str = name.substr(0, n) + '...';
        }
    } else {
        str = name;
    }
    return str;
}

function HTMLescape(html){
    return document.createElement('div')
        .appendChild(document.createTextNode(html))
        .parentNode
        .innerHTML;
}

function userInputOPtionsForSelect2(user_search_url) {
    return {
        tags: [],

        minimumInputLength: 1, // input at least 1 character

        ajax: {
            url: user_search_url,
            dataType: 'json',
            delay: 250,
            cache: true,
            data: function (params) {
                return {
                    q: params
                };
            },
            results: function (data) {
                var user_list = [], users = data['users'];
                for (var i = 0, len = users.length; i < len; i++) {
                    user_list.push({ // 'id' & 'text' are required by the plugin
                        "id": users[i].email,
                        // for search. both name & email can be searched.
                        // use ' '(space) to separate name & email
                        "text": users[i].name + ' ' + users[i].email,
                        "avatar_url": users[i].avatar_url,
                        "name": users[i].name
                    });
                }
                return {
                    results: user_list
                };
            }
        },

        // format items shown in the drop-down menu
        formatResult: function(item) {
            if (item.avatar_url) {
                return '<img src="' + item.avatar_url + '" width="32" height="32" class="avatar">' + '<span class="text ellipsis">' + HTMLescape(item.name) + '<br />' + HTMLescape(item.id) + '</span>';
            } else {
                return; // if no match, show nothing
            }
        },

        // format selected item shown in the input
        formatSelection: function(item) {
            return HTMLescape(item.name || item.id); // if no name, show the email, i.e., when directly input, show the email
        },

        createSearchChoice: function(term) {
            return {
                'id': term.trim()
            };
        },

        escapeMarkup: function(m) { return m; }
    };
}

var FileTree = {
    // list dirs & files
    renderTree: function($container, $form, initial_data, options) {
        $container.jstree({
            'core': {
                'data': function(node, callback) {
                    if (node.id == "#") {
                        callback(initial_data);
                    } else {
                        var repo_id;
                        var node_path = node.data.path;
                        if (node.parents.length == 1) { // parents: ['#']
                            repo_id = node.data.repo_id;
                        } else {
                            repo_id = $container.jstree('get_node', node.parents[node.parents.length - 2]).data.repo_id;
                        }

                        var url = $container.data('site_root') + 'ajax/repo/' + repo_id + '/dirents/'
                            + '?path=' + encodeURIComponent(node_path);
                        if (options && options.dir_only) {
                            url += '&dir_only=true';
                        }
                        $.ajax({
                            url: url,
                            cache: false,
                            dataType: 'json',
                            success: function(data) { // data: [{'name': '', 'type': 'dir'|'file'}, ...]
                                var node_name;
                                if (data.length) {
                                    for (var i = 0, len = data.length; i < len; i++) {
                                        node_name = data[i].name;
                                        if (data[i].type == 'dir') {
                                            node.children.push({
                                                'text': HTMLescape(node_name),
                                                'data': {
                                                    'path': node_path + node_name + '/'
                                                },
                                                'children': true
                                            });
                                        } else {
                                            node.children.push({
                                                'text': HTMLescape(node_name),
                                                'type': 'file',
                                                'data': {
                                                    'path': node_path + node_name
                                                }
                                            });
                                        }
                                    }
                                }
                            },
                            complete: function() {
                                callback(node.children);
                            }
                        });
                    }
                },
                'multiple': false, // only 1 item is allowed to be selected at one time
                'animation': 100
            }, // 'core' ends
            'types': { // custom node types
                'file': { // add type 'file'
                    'icon': 'jstree-file'
                }
            },
            'plugins': ['types']
        })
        .on('select_node.jstree', function(e, data) {
            var node = data.node;
            var repo_id;
            if (node.parents.length == 1) { // parents: ['#']
                repo_id = node.data.repo_id;
            } else {
                repo_id = $container.jstree('get_node', node.parents[node.parents.length - 2]).data.repo_id;
            }
            $('input[name="dst_repo"]', $form).val(repo_id);
            $('input[name="dst_path"]', $form).val(node.data.path);
        });
    },

    // only list dirs
    renderDirTree: function($container, $form, initial_data) {
        this.renderTree($container, $form, initial_data, {'dir_only': true});
    }
};

function quotaSizeFormat(bytes, precision) {
    var kilobyte = 1000;
    var megabyte = kilobyte * 1000;
    var gigabyte = megabyte * 1000;
    var terabyte = gigabyte * 1000;

    var precision = precision || 0;

    if ((bytes >= 0) && (bytes < kilobyte)) {
        return bytes + ' B';

    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        return (bytes / kilobyte).toFixed(precision) + ' KB';

    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
        return (bytes / megabyte).toFixed(precision) + ' MB';

    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
        return (bytes / gigabyte).toFixed(precision) + ' GB';

    } else if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + ' TB';

    } else {
        return bytes + ' B';
    }
}

function encodePath(path) {
    var path_arr = path.split('/'),
        path_arr_ = [];
    for (var i = 0, len = path_arr.length; i < len; i++) {
        path_arr_.push(encodeURIComponent(path_arr[i]));
    }
    return path_arr_.join('/');
}

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

$('input, textarea').placeholder();

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

function addAnchorsToHeaders(html) {
    var buildAnchorName = function(raw_text) {
        /*
         * Only unicode letter category, '-' and '_' will be used to build
         * an anchor name, spaces will be coverted to '-' and others will be omitted.
         */
        var punctuation = /[^\u0020\u002D\u0030-\u0039\u005F\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/g;
        return raw_text.replace(punctuation, "").replace(/\s+/g, "-");
    }

    var tree = $('<div>'+ html + '</div>');
    var headers = tree.find('h1,h2');
    headers.each(function() {
        var name = buildAnchorName($(this).text());
        var anchor = $('<a></a>', {
            href: '#' + name,
            name: name
        });
        anchor.append('<span class="sf2-icon-link"></span>').addClass('anchor vh');
        $(this).append(anchor);
    });
    return tree.html();
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

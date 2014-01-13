$('.top-bar-con .account').css('margin-left', $('.top-bar-con .manage').width() + 10);
$('#title-panel, #left-panel, #right-panel').each(function() { // for ie 7
    if ($(this).children().length == 0) {
        $(this).addClass('hide');
    }
});
$('#tabs').tabs({cookie:{expires:1}});

// handle messages
if ($('.messages')[0]) {
    $('#main').append($('.messages'));
    $('.messages').css({'left':($(window).width() - $('.messages').width())/2, 'top':10}).removeClass('hide');
    setTimeout(function() { $('.messages').addClass('hide'); }, 10000);
}

$(document).ready(function(){
    var msg_ct = $("#msg-count"); 
    $.ajax({
        url: msg_ct.data('cturl'),
        dataType: 'json',
        cache: false,
        success: function(data) {
            if (data['count'] > 0) {
                msg_ct.html(data['count']).addClass('msg-count');
            }
        }
    });
});
$('#msg-count').click(function() {
    location.href = $(this).data('pgurl');
});

(function () {
    var my_info = $('#my-info');
    var popup = $('#user-info-popup');

    $(window).load(function() {
        if (my_info.length > 0) { // before login, no 'my_info'
            popup.css({'right': my_info.parent().width() - my_info.position().left - my_info.outerWidth()});
        }
    }); 
    my_info.click(function() {
        var loading_tip = $('.loading-tip', popup);
        if (popup.hasClass('hide')) {
            popup.removeClass('hide');
            loading_tip.removeClass('hide');
            $.ajax({
                url: my_info.data('url'),
                dataType: 'json',
                cache: false,
                success: function(data) {
                    loading_tip.addClass('hide');
                    popup.html(data['html']);
                    $('.item:first', popup).css({'border':0});
                }
            });
        } else {
            popup.addClass('hide');
        }
        return false;
    });
})();

$(document).click(function(e) {
    var target = e.target || event.srcElement,
        popup = $('#user-info-popup'),
        popup_switch = $('#my-info');
    if (!popup.hasClass('hide') && !popup.is(target) && !popup.find('*').is(target) && !popup_switch.is(target) && !popup_switch.find('*').is(target) ) {
        popup.addClass('hide');
    }    
});

// search: disable submit when input nothing
$('.search-form').submit(function() {
    if (!$.trim($(this).find('.search-input').val())) {
        return false;
    }
});

$(".checkbox-label").hover(
	function() {
		$(this).addClass('hl');
	},
	function() {
		$(this).removeClass('hl');
	}
);

$("tr:gt(0)", $('table')).hover(
    function() {
		$(this).addClass('hl');
        $(this).find('.op-icon, .op').removeClass('vh');
    },  
    function() {
        $(this).find('.op-icon, .op').addClass('vh');
		$(this).removeClass('hl');
    }   
);

$('input, textarea').placeholder();
$('.checkbox-orig').click(function() {
    $(this).parent().toggleClass('checkbox-checked');
});

(function() {
    var lang_context = $('#lang-context'),
        lang_selector = $('#lang-context-selector');

    $(window).load(function() { // after the small images, icons loaded.
        lang_selector.css({'right': lang_context.parent().width() - lang_context.position().left - lang_context.outerWidth()});
    });

    lang_context.click(function() {
        lang_selector.toggleClass('hide');
        return false;
    }).focus(function() { $(this).blur(); });

    $(document).click(function(e) {
        var element = e.target || e.srcElement;
        if (element.id != 'lang-context-selector' && element.id != 'lang-context') {
            lang_selector.addClass('hide');
        }
    });
})();

// clear repo enc info when log out
$('#logout').click(function() {
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
if ($.browser.mozilla || $.browser.msie) {
    $('a').focus(function() {
        $(this).blur();
    });
}
if ($.browser.msie) {
    $('button, input[type="checkbox"], input[type="radio"], input[type="submit"]').focus(function() {
        $(this).blur();
    });
    $('.search-input').css({'line-height':$('.search-input').css('height')});
}

/*
 * add op confirm popup
 * e.g: <button data-url="" data-target="">xxx</button>
 * e.g: addConfirmTo($('.user-del'), {'title': 'Delete user', 'con':'Really del user %s ?'});
 */
function addConfirmTo(op_ele, popup) {
    op_ele.click(function() {
        var con = '';
        if ($(this).data('target') && popup['con'].indexOf('%s') != -1) {
            con = popup['con'].replace('%s', '<span class="op-target">' + $(this).data('target') + '</span>');
        } else {
            con = popup['con'];
        }
        $('#confirm-con').html('<h3>' + popup['title'] + '</h3><p>' + con + '</p>');
        $('#confirm-popup').modal({appendTo:'#main'});
        $('#simplemodal-container').css({'height':'auto'});
        $('#confirm-yes').data('url', $(this).data('url')).click(function() {
            location.href = $(this).data('url');
        });
        return false;//in case op_ele is '<a>'
    });
}

/*
 * func: add autocomplete to some input ele
 * @param ele_id: autocomplete is added to this ele(ment), e.g-'#xxx'
 * @param container_id: id of autocomplete's container, often container of element above
 * @param data: tip data in array, e.g- ['xx', 'yy']
 */
function addAutocomplete(ele_id, container_id, data) {
    function split(val) {
        return val.split(/,\s*/);
    }
    function extractLast(term) {
        return split(term).pop();
    }

    $(ele_id)
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB &&
                $(this).data("autocomplete").menu.active) {
                event.preventDefault();
            }
        })
        .bind('autocompleteopen', function(e, ui) {
            $(ele_id).autocomplete('widget').css({'max-width':$(ele_id).width(), 'max-height':$(window).height() + $(window).scrollTop() - $(ele_id).offset().top - $(ele_id).outerHeight()});
        })
        .autocomplete({
            appendTo: container_id,
            autoFocus: true,
            delay: 100,
            minLength: 0,
            source: function(request, response) {
                var matcher = new RegExp($.ui.autocomplete.escapeRegex(extractLast(request.term)), "i");
                response($.grep(data, function(value) {
                    return matcher.test(value.value);
                }));
            },
            focus: function() {
                return false;
            },
            select: function(event, ui) {
                var terms = split(this.value);
                terms.pop();
                terms.push(ui.item.label);
                terms.push("");
                this.value = terms.join(", ");
                return false;
            }
        });
}

/*
 * func: add autocomplete for `@` to some input ele
 * @param ele_id: autocomplete is added to this ele(ment), e.g-'#xxx'
 * @param ele_css: {'xx':'xxx'}, styles to be applied to ele_cp
 * @param container_id: id of autocomplete's container, often container of element above
 */
function addAtAutocomplete(ele_id, container_id, gids, aj_url, ele_css) {
    var pos = ''; // cursor position
    var cursor_at_end; // Boolean. if cursor at the end or in the middle.
    var end_str = ''; // str after '@' when '@' is inserted into the middle of the ele's value
    var ele_scrollTop = 0; // scrollTop of ele. defined to fix a bug for ff (after selecting a item, it turns into 0)

    /*
     * make a copy of ele, in order to get coordinates of '@'
     * make sure ele_cp has the same 'width', 'font', 'line-height', 'border', 'padding', and etc, with ele
     */
    var ele_cp = '<div id="' + ele_id.substring(1) + '-cp"></div>';
    $('#main').append(ele_cp);
    ele_cp = $(ele_id + '-cp');
    ele_cp.css({'position':'absolute', 'left':0, 'bottom':0, 'z-index':-10000, 'visibility':'hidden', 'white-space':'pre-wrap'}).css(ele_css);

    $(ele_id)
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB &&
                $(this).data("autocomplete").menu.active) {
                event.preventDefault();
            }
        })
        .bind('keypress', function(e) {
            if (String.fromCharCode(e.keyCode || e.charCode) == '@') {
                var str = '';
                pos = getCaretPos($(this)[0]);
                if (pos == $(this).val().length) {
                    cursor_at_end = true;
                    str = $(this).val();
                } else {
                    cursor_at_end = false;
                    end_str = $(this).val().substring(pos);
                    str = $(this).val().substring(0, pos);
                }
                ele_cp.html(str.replace(/</g, '&lt').replace(/>/g, '&gt').replace(/`/g, '&#96').replace(/"/g, '&quot').replace(/\r\n|\r|\n/g, "<br />") + '<span id="' + ele_id.substring(1) + '-at">@</span>');
                var line_height = parseInt(ele_cp.css('line-height')),
                    at_pos = $(ele_id + '-at').position(),
                    x = at_pos.left,
                    y = at_pos.top + line_height - 2 - $(ele_id).scrollTop();
                $(this).autocomplete("option", "position", { my : "left top", at: "left top", offset: x + ' ' + y, collision: 'fit'});
                $(this).bind('autocompleteopen', function(e, ui) {
                    var menu = $(this).autocomplete('widget'),
                        menu_height = menu.outerHeight();
                    if ($(this).offset().top + y + menu_height > $(window).height() + $(window).scrollTop()) {
                        y = y - menu_height - line_height;
                        menu.offset({left: $(ele_id).offset().left + x, top:$(ele_id).offset().top + y});
                    }
                });
                ele_scrollTop = $(ele_id).scrollTop();
            }
        })
        .autocomplete({
            appendTo: container_id,
            autoFocus: true,
            delay: 0,
            minLength: 0,
            source: function(request, response) {
                if (pos === '') {
                    return false;
                }
                if ($(ele_id).val().charAt(pos) == '@' && getCaretPos($(ele_id)[0]) > pos) { // cursor is at the right of the current @
                    var request_term = '';
                    if (cursor_at_end) {
                        request_term = request.term.substring(pos + 1);
                    } else {
                        request_term = request.term.slice(pos + 1, - end_str.length);
                    }
                    $.ajax({
                        url: aj_url,
                        dataType: "json",
                        data: {
                            gids: gids,
                            name_startsWith: request_term
                        },
                        success: function(data) {
                            response($.map(data, function(value) {
                                return {
                                    label: value.contact_name,
                                    value: value.contact_name
                                }
                            }));
                        }
                    });
                } else {
                    response(null); // when cursor is at the left of current @ or @ is deleted
                }
            },
            focus: function(e, ui) {
                   return false;
            },
            select: function(e, ui) {
                var str = $(this).val().substring(0, pos + 1) + ui.item.label + ' ';
                if (cursor_at_end) {
                    $(this).val(str);
                } else {
                    $(this).val(str + end_str);
                    setCaretPos($(this)[0], pos + ui.item.label.length + 2);
                }
                $(ele_id).scrollTop(ele_scrollTop); // fix ff problem: ele scrolls to the top most.
                return false;
            }
        });
     $(ele_id).autocomplete('widget').css({'max-width':$(ele_id).width()/2, 'max-height':$(document).height() - $(ele_id).offset().top - $(ele_id).height()});
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

function prepareCSRFToken(xhr, settings) {
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
    if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
        // Only send the token to relative URLs i.e. locally.
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
}

function apply_form_error(formid, error_msg) {
    $("#" + formid + " .error").html(error_msg).removeClass('hide');
    $("#simplemodal-container").css({'height':'auto'});
}

// show feedback
function feedback(con, type, time) {
    var time = time || 5000;
    if ($('.messages')[0]) {
        $('.messages').html('<li class="' + type + '">' + con + '</li>');
    } else {
        var html = '<ul class="messages"><li class="' + type + '">' + con + '</li></ul>';
        $('#main').append(html);
    }
    $('.messages').css({'left':($(window).width() - $('.messages').width())/2, 'top':10}).removeClass('hide');
    setTimeout(function() { $('.messages').addClass('hide'); }, time);
}
function disable(btn) {
    btn.attr('disabled', 'disabled').addClass('btn-disabled');
}
function enable(btn) {
    btn.removeAttr('disabled').removeClass('btn-disabled');
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

// File Tree 'class'(constructor)
function FileTree() {
}
// format repo data fetched via ajax
FileTree.prototype.format_repo_data = function(data) {
    var repos = [], repo;
    for (var i = 0, len = data.length; i < len; i++) {
        repo = {
            'data': data[i].name,
            'attr': {'repo_id': data[i].id, 'root_node': true},
            'state': 'closed'
        }
        repos.push(repo);
    }
    return repos;
};
/**
 * @container(required): container.data('site_root', '{{SITE_ROOT}}')
 * @options (optional): {'two_state': true}
 */
FileTree.prototype.renderFileTree = function(container, repo_data, options) {
    var opts = options || {};
    container
        .delegate('.jstree-closed', 'dblclick', function(e) {
            container.jstree('open_node', $(this));
            $(this).find('a').removeClass('jstree-clicked');
        })
        .jstree({
            'json_data': {
                'data': repo_data,
                'ajax': {
                    'url': function(data) {
                        var path = this.get_path(data);
                        var repo_id;
                        if (path.length == 1) {
                            path = '/';
                            repo_id = data.attr('repo_id');
                        } else {
                            var root_node = data.parents('[root_node=true]');
                            repo_id = root_node.attr('repo_id');
                            path.shift();
                            path = '/' + path.join('/') + '/';
                        }
                        return container.data('site_root') + 'ajax/repo/' + repo_id + '/dirents/?path=' + e(path);
                    },
                    'success': function(data) {
                        var items = [];
                        var o, item;
                        for (var i = 0, len = data.length; i < len; i++) {
                            o = data[i];
                            if (o.type == 'dir') {
                                item = { 
                                    'data': o.name, 
                                    'attr': { 'type': o.type },
                                    'state': 'closed'
                                };
                            } else {
                                item = {
                                    'data': o.name, 
                                    'attr': {'type': o.type }
                                };
                            }
                            items.push(item);
                        }
                        return items;
                    }
                }
            },
            'core': {
                'animation': 100
            },
            'themes': {
                'theme':'classic'
            },
            'checkbox':{
                'two_state': opts.two_state, // default: false. when 'true', dir can be checked separately with file
                'override_ui':true, // nodes can be checked, or selected to be checked
                'real_checkboxes': true,
                'real_checkboxes_names': function(node) {
                    // get the path array consisting of nodes starting from the root node
                    var path_array = this.get_path(node);
                    var repo_id, path;
                    if (path_array.length == 1) {
                        // root node
                        path = '/';
                        repo_id = node.attr('repo_id');
                    } else {
                        path_array.shift();
                        repo_id = node.parents('[root_node=true]').attr('repo_id');
                        if (node.attr('type') == 'dir') {
                            path = '/' + path_array.join('/') + '/';
                        } else {
                            path = '/' + path_array.join('/');
                        }
                    }
                    return ['selected', repo_id + path];
                }
            },
            'plugins': ['themes', 'json_data', 'ui', 'checkbox']
        });
};
// only list dirs
FileTree.prototype.renderDirTree = function(container, form, repo_data) {
    container
        .delegate('.jstree-closed', 'dblclick', function(e) {
            container.jstree('open_node', $(this));
            $(this).find('a').removeClass('jstree-clicked');
        })
        .bind('before.jstree', function(e, data) {
            if (data.func === 'select_node') { // ensure only one selected dir display in the popup
                $('.jstree-clicked', form).removeClass('jstree-clicked');
            }
        })
        .bind('select_node.jstree', function(e, data) {
            var path, repo_id;
            var path_array = data.inst.get_path(data.rslt.obj);
            if (path_array.length == 1) {
                path = '/';
                repo_id = data.rslt.obj.attr('repo_id');
            } else {
                repo_id = data.rslt.obj.parents('[root_node=true]').attr('repo_id');
                path_array.shift();
                path = '/' + path_array.join('/') + '/';
            }
            $('input[name="dst_repo"]', form).val(repo_id);
            $('input[name="dst_path"]', form).val(path);
        })
        .jstree({
            'json_data': {
                'data': repo_data,
                'ajax': {
                    'url': function(data) {
                        var path = this.get_path(data);
                        var repo_id;
                        if (path.length == 1) {
                            path = '/';
                            repo_id = data.attr('repo_id');
                        } else {
                            repo_id = data.parents('[root_node=true]').attr('repo_id');
                            path.shift();
                            path = '/' + path.join('/') + '/';
                        }
                        return container.data('site_root') + 'ajax/repo/' + repo_id + '/dirents/?dir_only=true&path=' + e(path);
                    },
                    'success': function(data) {
                        var items = [];
                        var o, item;
                        for (var i = 0, len = data.length; i < len; i++) {
                            o = data[i];
                            if (o.has_subdir) {
                                item = { 
                                    'data': o.name, 
                                    'attr': { 'type': o.type },
                                    'state': 'closed'
                                };
                            } else {
                                item = {
                                    'data': o.name, 
                                    'attr': {'type': o.type }
                                };
                            }
                            items.push(item);
                       }
                        return items;
                    }
                }
            },
            'core': {
                'animation': 100
            },
            'plugins': ['themes', 'json_data', 'ui']
        });
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

function buildAnchorName(raw_text) {
    /*
     * Only unicode letter category, '-' and '_' will be used to build
     * an anchor name, spaces will be coverted to '-' and others will be omitted.
     */
    var punctuation = /[^\u0020\u002D\u0030-\u0039\u005F\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/g;
    return raw_text.replace(punctuation, "").replace(/\s+/g, "-");
}

function addAnchorsToHeaders(html) {
    var tree = $('<div>'+ html + '</div>');
    var headers = tree.find('h1,h2');
    headers.each(function() {
        var name = buildAnchorName($(this).text());
        var anchor = $('<a/>', {
            href: '#' + name,
            name: name
        });
        anchor.append('<span class=icon-link> </span>')
              .css('textDecoration','none');
        $(this).prepend(anchor);
    });
    return tree.html();
}

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

// search: disable submit when input nothing
$('.search-form').submit(function() {
    if (!$.trim($(this).find('.search-input').val())) {
        return false;
    }
});

//highlight the tr when mouse hover on it
$("table tr:gt(0), .checkbox-label").hover(
	function() {
		$(this).addClass('hl');
	},
	function() {
		$(this).removeClass('hl');
	}
);

$('input, textarea').placeholder();
$('.checkbox-orig').click(function() {
    $(this).parent().toggleClass('checkbox-checked');
});

$('#lang-context').click(function() {
        if ($(this).attr('data') == 'no-popup') {
            $(this).parent().css('position', 'relative');
            $('#lang-context-selector').removeClass('hide');
            $(this).attr('data', 'has-popup');
        } else {
            $('#lang-context-selector').addClass('hide');
            $(this).attr('data', 'no-popup');
        }
        return false;
    }).focus(function() { $(this).blur(); });
$(document).click(function(e) {
    var element = e.target || e.srcElement;
    if (element.id != 'lang-context-selector' && element.id != 'lang-context') {
        $('#lang-context-selector').addClass('hide');
        $('#lang-context').attr('data', 'no-popup');
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

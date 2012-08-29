/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */

//add op confirm dialog
var Op_url = '';
function addConfirmTo(ele, confirm_con) {
    ele.each(function() {
        $(this).click(function() {
			if (confirm_con) {
				$('#confirm-con').html(confirm_con);
			}
            $('#dialog-confirm').modal({appendTo:'#main'});
            Op_url = $(this).attr('data');
            return false;//in case ele is '<a>'
        });
    });
}
$('#yes-btn').click(function() {
    location.href = Op_url;
});

//handle table
$("table tr:nth-child(even)").addClass("even");
$("table tr:nth-child(odd)").addClass("odd");

//highlight the tr when mouse hover on it
$("table tr:gt(0)").hover(
	function() {
		$(this).addClass('hl');
	},
	function() {
		$(this).removeClass('hl');
	}
);

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
        .autocomplete({
            appendTo: container_id,
            autoFocus: true,
            delay: 100,
            minLength: 0,
            source: function(request, response) {
                response($.ui.autocomplete.filter(data, extractLast(request.term)));
            },
            focus: function() {
                return false;
            },
            select: function(event, ui) {
                var terms = split(this.value);
                terms.pop();
                terms.push(ui.item.value);
                terms.push("");
                this.value = terms.join(", ");
                return false;
            }
        });
}

/*
 * func: add autocomplete for `@` to some input ele
 * @param ele_id: autocomplete is added to this ele(ment), e.g-'#xxx'
 * @param ele_css: {'xx':'xxx'}, to be added to ele_cp(a cp of ele)
 * @param container_id: id of autocomplete's container, often container of element above
 */
function addAtAutocomplete(ele_id, container_id, data, ele_css) {
    var pos = '';
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
                pos = getCaretPos($(ele_id)[0]); // get cursor position
                if (pos == $(this).val().length) {
                    cursor_at_end = true;
                    str = $(this).val();
                } else {
                    cursor_at_end = false;
                    end_str = $(this).val().substring(pos);
                    str = $(this).val().substring(0, pos);
                }
                ele_cp.html(str + '<span id="' + ele_id.substring(1) + '-at">@</span>');
                at_pos = $(ele_id + '-at').position();
                var x = at_pos.left,
                    y = at_pos.top + parseInt(ele_cp.css('line-height')) - 2 - $(ele_id).scrollTop();
                $(ele_id).autocomplete("option", "position", { my : "left top", at: "left top", offset: x + ' ' + y, collision: 'fit'});
                ele_scrollTop = $(ele_id).scrollTop();
            }
        })
        .autocomplete({
            appendTo: container_id,
            autoFocus: true,
            delay: 100,
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
                    var matcher = new RegExp($.ui.autocomplete.escapeRegex(request_term), "i");
                    response($.grep(data, function(value) {
                        return matcher.test(value.value);
                    }));
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

    precision = precision || 0;
   
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
    var form_err = $("#" + formid + " .error"),
        container = $("#simplemodal-container");

    form_err.html(error_msg).attr('class', 'error');
    container.css('height', $('#'+formid).height());
}

//handle messages
if ($('.messages')) {
    $('#main').append($('.messages')).css('position','relative');
    $('.messages').css({'left':($('#main').width() - $('.messages').width())/2 + 'px', 'top':'-20px'}).removeClass('hide');
    setTimeout(function() { $('.messages').addClass('hide'); }, 3000);
}

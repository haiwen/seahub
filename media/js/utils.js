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

function filesizeformat(bytes, precision)
{  
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

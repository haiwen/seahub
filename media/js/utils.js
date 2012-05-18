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

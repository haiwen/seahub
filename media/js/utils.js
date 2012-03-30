//add delete confirm dialog
var Del_url = '';
function addConfirmTo(ele) {
    ele.each(function() {
        $(this).click(function() {
            $('#dialog-delete-confirm').modal({appendTo:'#main'});
            Del_url = $(this).attr('data');
        });
    });
}
$('#yes-btn').click(function() {
    location.href = Del_url;
});
//handle table
$("table tr:nth-child(even)").addClass("even");
$("table tr:nth-child(odd)").addClass("odd");


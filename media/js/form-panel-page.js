   // set the panel's position
   var $panel = $('.page-form-panel');
   var panelContainerHeight = $('#main').height();
   var panelHeight = $panel.height();
   if (panelContainerHeight > (panelHeight + parseInt($panel.css('margin-top')) + parseInt($panel.css('margin-bottom')))) {
     $panel.css('margin-top', (panelContainerHeight - panelHeight) / 2 + 'px');
   }
   $panel.removeClass('invisible');

   // set eye/eyeSlash icons
   $('.input-group .btn').html(eyeSlashIcon).on('click', function() {
     var $prev = $(this).prev('input');
     var currentInputType = $prev.attr('type');
     var nextInputType = currentInputType == 'text' ? 'password' : 'text';
     $prev.attr('type', nextInputType)
     if (nextInputType == 'text') {
       $(this).html(eyeIcon);
     } else {
       $(this).html(eyeSlashIcon);
     }
   });

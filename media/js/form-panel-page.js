   // set the panel's position
   var $panel = $('.page-form-panel');
   var panelContainerHeight = $('#main').height();
   var panelHeight = $panel.height();
   if (panelContainerHeight > (panelHeight + parseInt($panel.css('margin-top')) + parseInt($panel.css('margin-bottom')))) {
     $panel.css('margin-top', (panelContainerHeight - panelHeight) / 2 + 'px');
   }
   $panel.removeClass('invisible');

   // set eye/eyeSlash icons and keep password toggles accessible
   $('.input-group .btn').html(eyeSlashIcon).on('click', function() {
     var $button = $(this);
     var $prev = $button.prev('input');
     var nextInputType = $prev.attr('type') == 'text' ? 'password' : 'text';
     var isPasswordVisible = nextInputType == 'text';
     var label = $button.attr(isPasswordVisible ? 'data-hide-label' : 'data-show-label');

     $prev.attr('type', nextInputType);
     $button.html(isPasswordVisible ? eyeIcon : eyeSlashIcon);
     $button.attr({
       title: label,
       'aria-label': label,
       'aria-pressed': isPasswordVisible ? 'true' : 'false'
     });
   });

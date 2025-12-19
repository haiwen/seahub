// set the panel's position
var $panel = $('.tfa-panel');
var panelContainerHeight = $('#main').height();
var panelHeight = $panel.height();
if (panelContainerHeight > (panelHeight + parseInt($panel.css('margin-top')) + parseInt($panel.css('margin-bottom')))) {
  $panel.css('margin-top', (panelContainerHeight - panelHeight) / 2 + 'px');
}
$panel.removeClass('invisible');

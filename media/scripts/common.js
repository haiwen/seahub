//The build will inline common dependencies into this file.

//For any third party dependencies, like jQuery, place them in the lib folder.

//Configure loading modules from the lib directory,
//except for 'app' ones, which are in a sibling directory.

require.config({
    // The shim config allows us to configure dependencies for
    // scripts that do not call define() to register a module
    shim: {
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: [
                'underscore',
                'jquery'
            ],
            exports: 'Backbone'
        },
    },
    paths: {
        jquery: 'lib/jq.min',
        underscore: 'lib/underscore',
        backbone: 'lib/backbone',
        text: 'lib/text'
    }
});

define([
    'jquery',
    'underscore'
], function($, _) {
    return {
        INFO_TIMEOUT: 10000,     // 10 secs for info msg
        SUCCESS_TIMEOUT: 3000,   // 3 secs for success msg
        ERROR_TIMEOUT: 3000,     // 3 secs for error msg

        showConfirm: function(title, content, yesCallback) {
            var $popup = $("#confirm-popup");
            var $cont = $('#confirm-con');
            var $container = $('#simplemodal-container');
            var $yesBtn = $('#confirm-yes');

            $cont.html('<h3>' + title + '</h3><p>' + content + '</p>');
            $popup.modal({appendTo: '#main'});
            $container.css({'height':'auto'});

            $yesBtn.click(yesCallback);
        },

        closeModal: function() {
            $.modal.close();
        },

        feedback: function(con, type, time) {
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


    }
});

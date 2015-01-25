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
        },

        // TODO: Change to jquery function like $.disableButtion(btn)
        enableButton: function(btn) {
          btn.removeAttr('disabled').removeClass('btn-disabled');
        },

        disableButton: function(btn) {
          btn.attr('disabled', 'disabled').addClass('btn-disabled');
        },

        prepareCSRFToken: function(xhr, settings) {
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
        },

        ajaxPost: function(params) {
          var form = params.form,
          post_url = params.post_url,
          post_data = params.post_data,
          after_op_success = params.after_op_success,
          form_id = params.form_id;
          var submit_btn = form.children('[type="submit"]');
          this.disableButton(submit_btn);
          $.ajax({
            url: post_url,
            type: 'POST',
            dataType: 'json',
            beforeSend: this.prepareCSRFToken,
            data: post_data,
            success: function(data) {
              if (data['success']) {
                after_op_success(data);
              }
            },
            error: function(xhr, textStatus, errorThrown) {
              var err;
              if (xhr.responseText) {
                err = $.parseJSON(xhr.responseText).error;
              } else {
                err = getText("Failed. Please check the network.");
              }
              this.feedback(err);
              //enable(submit_btn);
            }
          });
        },

    }
});

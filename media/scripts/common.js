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

        getUrl: function(options) {
            var siteRoot = app.config.siteRoot;
            switch (options.name) {
              case 'get_lib_dirents': return siteRoot + 'ajax/lib/' + options.repo_id + '/dirents/';
              case 'star_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/star/';
              case 'unstar_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/unstar/';
              case 'del_dir': return siteRoot + 'ajax/repo/' + options.repo_id + '/dir/delete/';
              case 'del_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/delete/';
              case 'rename_dir': return siteRoot + 'ajax/repo/' + options.repo_id + '/dir/rename/';
              case 'rename_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/rename/';
              case 'mv_dir': return siteRoot + 'ajax/repo/' + options.repo_id + '/dir/mv/';
              case 'cp_dir': return siteRoot + 'ajax/repo/' + options.repo_id + '/dir/cp/';
              case 'mv_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/mv/';
              case 'cp_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/cp/';
              case 'new_dir': return siteRoot + 'ajax/repo/' + options.repo_id + '/dir/new/';
              case 'new_file': return siteRoot + 'ajax/repo/' + options.repo_id + '/file/new/';
              case 'repo_new_file': return siteRoot + 'repo/' + options.repo_id + '/files/';
              case 'del_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/delete/';
              case 'mv_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/move/';
              case 'cp_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/copy/';
              case 'get_file_op_url': return siteRoot + 'ajax/repo/' + options.repo_id + '/file_op_url/';
              case 'get_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/';
              case 'thumbnail_create': return siteRoot + 'thumbnail/' + options.repo_id + '/create/';
              case 'unenc_rw_repos': return siteRoot + 'ajax/unenc-rw-repos/';
              case 'get_cp_progress': return '';
              case 'cancel_cp': return '';
              case 'get_shared_link': return '';
              case 'get_shared_upload_link': return '';
            }
        },

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

        showFormError: function(formid, error_msg) {
            $("#" + formid + " .error").html(error_msg).removeClass('hide');
            $("#simplemodal-container").css({'height':'auto'});
        },

        ajaxErrorHandler: function(xhr, textStatus, errorThrown) {
            if (xhr.responseText) {
                feedback($.parseJSON(xhr.responseText).error, 'error');
            } else {
                feedback(getText("Failed. Please check the network."), 'error');
            }
        },

        // TODO: Change to jquery function like $.disableButtion(btn)
        enableButton: function(btn) {
            btn.removeAttr('disabled').removeClass('btn-disabled');
        },

        disableButton: function(btn) {
            btn.attr('disabled', 'disabled').addClass('btn-disabled');
        },

        setCaretPos: function(inputor, pos) {
            var range;
            if (document.selection) {
                range = inputor.createTextRange();
                range.move("character", pos);
                return range.select();
            } else {
                return inputor.setSelectionRange(pos, pos);
            }
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
                    this.enableButton(submit_btn);
                }
            });
        },

        pathJoin: function(array) {
            var result = array[0];
            for (var i = 1; i < array.length; i++) {
                if (result[result.length-1] == '/' || array[i][0] == '/')
                    result += array[i];
                else
                    result += '/' + array[i];
            }
            return result;
        },

    }
});

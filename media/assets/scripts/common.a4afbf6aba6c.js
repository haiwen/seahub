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
        }
    },
    paths: {
        'jquery': 'lib/jquery',
        'jquery.ui.core': 'lib/jquery.ui.core',
        'jquery.ui.widget': 'lib/jquery.ui.widget.1.11.1',
        'jquery.ui.progressbar': 'lib/jquery.ui.progressbar',

        'jquery.ui.tabs': 'lib/jquery.ui.tabs',
        'tmpl': 'lib/tmpl.min',
        'jquery.iframe-transport': 'lib/jquery.iframe-transport.1.4',
        'jquery.fileupload': 'lib/jquery.fileupload.5.42.1',
        'jquery.fileupload-process': 'lib/jquery.fileupload.file-processing.1.3.0',
        'jquery.fileupload-validate': 'lib/jquery.fileupload.validation.1.1.2',
        'jquery.fileupload-ui': 'lib/jquery.fileupload.ui.9.6.0',

        'jquery.magnific-popup': 'lib/jquery.magnific-popup',

        simplemodal: 'lib/jquery.simplemodal.1.4.4.min',
        jstree: 'lib/jstree.1.0',
        select2: 'lib/select2-3.5.2',

        underscore: 'lib/underscore',
        backbone: 'lib/backbone',
        text: 'lib/text'
    }
});

define([
    'jquery',
    'underscore',
    'text',                     // Workaround for r.js, otherwise text.js will not be included
    'pinyin-by-unicode'
], function($, _, text, PinyinByUnicode) {
    return {
        INFO_TIMEOUT: 10000,     // 10 secs for info msg
        SUCCESS_TIMEOUT: 3000,   // 3 secs for success msg
        ERROR_TIMEOUT: 3000,     // 3 secs for error msg

        strChineseFirstPY: PinyinByUnicode.strChineseFirstPY,

        getUrl: function(options) {
            var siteRoot = app.config.siteRoot;
            switch (options.name) {
              case 'list_lib_dir': return siteRoot + 'ajax/lib/' + options.repo_id + '/dir/';
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
              case 'del_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/delete/';
              case 'mv_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/move/';
              case 'cp_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/copy/';
              case 'get_file_op_url': return siteRoot + 'ajax/repo/' + options.repo_id + '/file_op_url/';
              case 'get_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/';
              case 'repo_del': return siteRoot + 'ajax/repo/' + options.repo_id + '/remove/';
              case 'sub_repo': return siteRoot + 'ajax/repo/' + options.repo_id + '/dir/sub_repo/';
              case 'thumbnail_create': return siteRoot + 'thumbnail/' + options.repo_id + '/create/';
              case 'get_my_unenc_repos': return siteRoot + 'ajax/my-unenc-repos/';
              case 'unenc_rw_repos': return siteRoot + 'ajax/unenc-rw-repos/';
              case 'get_cp_progress': return siteRoot + 'ajax/cp_progress/';
              case 'cancel_cp': return siteRoot + 'ajax/cancel_cp/';
              case 'ajax_repo_remove_share': return siteRoot + 'share/ajax/repo_remove_share/';
              case 'get_user_contacts': return siteRoot + 'ajax/contacts/';
              case 'get_shared_download_link': return siteRoot + 'share/ajax/get-download-link/';
              case 'delete_shared_download_link': return siteRoot + 'share/ajax/link/remove/';
              case 'send_shared_download_link': return siteRoot + 'share/link/send/';
              case 'send_shared_upload_link': return siteRoot + 'share/upload_link/send/';
              case 'delete_shared_upload_link': return siteRoot + 'share/ajax/upload_link/remove/';
              case 'get_share_upload_link': return siteRoot + 'share/ajax/get-upload-link/';
              case 'private_share_dir': return siteRoot + 'share/ajax/private-share-dir/';
              case 'private_share_file': return siteRoot + 'share/ajax/private-share-file/';
              case 'get_popup_notices': return siteRoot + 'ajax/get_popup_notices/';
              case 'set_notices_seen': return siteRoot + 'ajax/set_notices_seen/';
              case 'get_unseen_notices_num': return siteRoot + 'ajax/unseen-notices-count/';
              case 'set_notice_seen_by_id': return siteRoot + 'ajax/set_notice_seen_by_id/';
              case 'repo_set_password': return siteRoot + 'repo/set_password/';
              case 'group_repos': return siteRoot + 'api2/groups/' + options.group_id + '/repos/';
              case 'group_basic_info': return siteRoot + 'ajax/group/' + options.group_id + '/basic-info/';
              case 'toggle_group_modules': return siteRoot + 'ajax/group/' + options.group_id + '/toggle-modules/';
              case 'toggle_personal_modules': return siteRoot + 'ajax/toggle-personal-modules/';
              case 'ajax_unset_inner_pub_repo': return siteRoot + 'ajax/unset-inner-pub-repo/' + options.repo_id + '/';
              case 'get_folder_perm_by_path': return siteRoot + 'ajax/repo/' + options.repo_id + '/get-folder-perm-by-path/';
              case 'set_user_folder_perm': return siteRoot + 'ajax/repo/' + options.repo_id + '/set-user-folder-perm/';
              case 'set_group_folder_perm': return siteRoot + 'ajax/repo/' + options.repo_id + '/set-group-folder-perm/';
              case 'starred_files': return siteRoot + 'api2/starredfiles/';
              case 'shared_repos': return siteRoot + 'api2/shared-repos/' + options.repo_id + '/';
              case 'search_user': return siteRoot + 'api2/search-user/';
            }
        },

        showConfirm: function(title, content, yesCallback) {
            var $popup = $("#confirm-popup");
            var $cont = $('#confirm-con');
            var $yesBtn = $('#confirm-yes');

            $cont.html('<h3>' + title + '</h3><p>' + content + '</p>');
            $popup.modal({appendTo: '#main'});
            $('#simplemodal-container').css({'height':'auto'});

            $yesBtn.click(yesCallback);
        },

        closeModal: function() {
            $.modal.close();
        },

        feedback: function(con, type, time) {
            var time = time || 5000;
            if ($('.messages').length > 0) {
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
                this.feedback($.parseJSON(xhr.responseText).error, 'error');
            } else {
                this.feedback(gettext("Failed. Please check the network."), 'error');
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

        prepareApiCsrf: function() {
            /* alias away the sync method */
            Backbone._sync = Backbone.sync;

            /* define a new sync method */
            Backbone.sync = function(method, model, options) {

                /* only need a token for non-get requests */
                if (method == 'create' || method == 'update' || method == 'delete') {
                    // CSRF token value is in an embedded meta tag
                    // var csrfToken = $("meta[name='csrf_token']").attr('content');
                    var csrfToken = app.pageOptions.csrfToken;

                    options.beforeSend = function(xhr){
                        xhr.setRequestHeader('X-CSRFToken', csrfToken);
                    };
                }

                /* proxy the call to the old sync method */
                return Backbone._sync(method, model, options);
            };
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
            // usually used for form ajax post in modal popup
            var _this = this,
                form = params.form,
                form_id = params.form_id,
                post_url = params.post_url,
                post_data = params.post_data,
                after_op_success = params.after_op_success,
                after_op_error;

            var submit_btn = form.children('[type="submit"]');
            this.disableButton(submit_btn);

            if (params.after_op_error) {
                after_op_error = params.after_op_error;
            } else {
                after_op_error = function(xhr, textStatus, errorThrown) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    _this.showFormError(form_id, err);
                    _this.enableButton(submit_btn);
                };
            }

            $.ajax({
                url: post_url,
                type: 'POST',
                dataType: 'json',
                beforeSend: this.prepareCSRFToken,
                data: post_data,
                success: after_op_success,
                error: after_op_error
            });
        },

        ajaxGet: function(params) {
            var _this = this,
                get_url = params.get_url,
                data = params.data,
                after_op_success = params.after_op_success,
                after_op_error;

            if (params.after_op_error) {
                after_op_error = params.after_op_error;
            } else {
                after_op_error = function(xhr, textStatus, errorThrown) {
                };
            }
            $.ajax({
                url: get_url,
                cache: false,
                dataType: 'json',
                data: data,
                success: after_op_success,
                error: after_op_error
            });
        },

        HTMLescape: function(html) {
            return document.createElement('div')
                .appendChild(document.createTextNode(html))
                .parentNode
                .innerHTML;
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

        encodePath: function(path) {
            return path.split('/').map(function(e) {
                return encodeURIComponent(e);
            }).join('/');
        },

        closePopup: function(e, popup, popup_switch) {
            var target = e.target || event.srcElement;
            if (!popup.hasClass('hide') && !popup.is(target) && !popup.find('*').is(target) && !popup_switch.is(target) && !popup_switch.find('*').is(target) ) {
                popup.addClass('hide');
            }
        },

        initAccountPopup: function() {
            // TODO: need improving
            $('#my-info').click(function() {
                var popup = $('#user-info-popup');
                popup.toggleClass('hide');
                if (!popup.hasClass('hide')) {
                    var loading_tip = $('.loading-tip', popup),
                    space_traffic = $('#space-traffic');
                    loading_tip.show();
                    space_traffic.addClass('hide');
                    $('.error', popup).addClass('hide');
                    $.ajax({
                        url: space_traffic.data('url'),
                        dataType: 'json',
                        cache: false,
                        success: function(data) {
                            loading_tip.hide();
                            space_traffic.html(data['html']).removeClass('hide');
                        },
                        error: function (xhr, textStatus, errorThrown) {
                            if (xhr.responseText) {
                                var error = $.parseJSON(xhr.responseText).error;
                                loading_tip.hide();
                                if ($('.error', popup).length == 0) {
                                    loading_tip.after('<p class="error alc">' + error + '</p>');
                                } else {
                                    $('.error', popup).removeClass('hide');
                                }
                            }
                        }
                    });
                }
            });

            _this = this;
            $(document).click(function(e) {
                _this.closePopup(e, $('#user-info-popup'), $('#my-info'));
            });
        },

        initNoticePopup: function() {
            var msg_ct = $("#msg-count");

            // for login page, and pages without 'header' such as 'file view' page.
            if (msg_ct.length == 0) {
                return false;
            }
            // original title
            var orig_doc_title = document.title;
            msg_ct.data('orig_doc_title', orig_doc_title); // for 'mark all read' in 'notice list' page
            var reqUnreadNum = function() {
                $.ajax({
                    url: _this.getUrl({name: 'get_unseen_notices_num'}),
                    dataType: 'json',
                    cache: false,
                    success: function(data) {
                        var count = data['count'],
                            num = $('.num', msg_ct);
                        num.html(count);
                        if (count > 0) {
                            num.removeClass('hide');
                            document.title = '(' + count + ')' + orig_doc_title;
                        } else {
                            num.addClass('hide');
                            document.title = orig_doc_title;
                        }
                    }
                });
            };
            reqUnreadNum();
            // request every 30s
            setInterval(reqUnreadNum, 30*1000);

            $('#notice-icon').click(function() {
                var popup = $('#notice-popup');
                popup.toggleClass('hide');

                if (!popup.hasClass('hide')) {
                    $('.con', popup).css({'max-height':$(window).height() - $('#header').outerHeight() - $('.hd', popup).outerHeight() - 3});
                    var loading_tip = $('.loading-tip', popup),
                        notice_list = $('#notice-list');
                    notice_list.addClass('hide');
                    loading_tip.show();
                    $('.error', popup).addClass('hide');

                    $.ajax({
                        url: _this.getUrl({name: 'get_popup_notices'}),
                        dataType: 'json',
                        success: function(data) {
                            loading_tip.hide();
                            notice_list.html(data['notice_html']).removeClass('hide');

                            // set a notice to be read when <a> in it is clicked
                            $('.unread a', notice_list).click(function() {
                                var notice_id = $(this).parents('.unread').data('id');
                                var link_href = $(this).attr('href');
                                $.ajax({
                                    url: _this.getUrl({name: 'set_notice_seen_by_id'}) + '?notice_id=' + encodeURIComponent(notice_id),
                                    dataType:'json',
                                    success: function(data) {
                                        location.href = link_href;
                                    },
                                    error: function() {
                                        location.href = link_href;
                                    }
                                });
                                return false;
                            });
                            $('.detail', notice_list).click(function() {
                                location.href = $('.brief a', $(this).parent()).attr('href');
                            });
                        },
                        error: function (xhr, textStatus, errorThrown) {
                            if (xhr.responseText) {
                                var error = $.parseJSON(xhr.responseText).error;
                                loading_tip.hide();
                                if ($('.error', popup).length == 0) {
                                    loading_tip.after('<p class="error alc">' + error + '</p>');
                                } else {
                                    $('.error', popup).removeClass('hide');
                                }
                            }
                        }
                    });
                }
            });
            $(window).resize(function() {
                var popup = $('#notice-popup');
                if (!popup.hasClass('hide')) {
                    $('.con', popup).css({'max-height':$(window).height() - $('#header').outerHeight() - $('.hd', popup).outerHeight() - 3});
                }
            });

            $('#notice-popup .close').click(function() {
                $('#notice-popup').addClass('hide');
                if ($('#notice-list .unread').length > 0) {
                    // set all unread notice to be read
                    $.ajax({
                        url: _this.getUrl({name: 'set_notices_seen'}),
                        dataType: 'json',
                        success: function() {
                            $('.num', msg_ct).html(0).addClass('hide');
                            document.title = orig_doc_title;
                        }
                    });
                }
            });

            $(document).click(function(e) {
                _this.closePopup(e, $('#notice-popup'), $('#notice-icon'));
            });
        },

        closeTopNoticeBar: function () {
            if (!app.pageOptions.cur_note) {
                return false;
            }
            var new_info_id = app.pageOptions.cur_note.id;
            $('#info-bar').addClass('hide');
            if (navigator.cookieEnabled) {
                var date = new Date(),
                    cookies = document.cookie.split('; '),
                    info_id_exist = false;
                date.setTime(date.getTime() + 14*24*60*60*1000);
                new_info_id += '; expires=' + date.toGMTString() + '; path=' + app.config.siteRoot;
                for (var i = 0, len = cookies.length; i < len; i++) {
                    if (cookies[i].split('=')[0] == 'info_id') {
                        info_id_exist = true;
                        document.cookie = 'info_id=' + cookies[i].split('=')[1] + new_info_id;
                        break;
                    }
                }
                if (!info_id_exist) {
                    document.cookie = 'info_id=' + new_info_id;
                }
            }
        },

        contactInputOptionsForSelect2: function() {
            var _this = this;
            return {
                placeholder: gettext("Search users or enter emails"),

                // with 'tags', the user can directly enter, not just select
                // tags need `<input type="hidden" />`, not `<select>`
                tags: [],

                tokenSeparators: [",", " "],

                minimumInputLength: 1, // input at least 1 character

                ajax: {
                    url: _this.getUrl({name: 'search_user'}),
                    dataType: 'json',
                    delay: 250,
                    cache: true,
                    data: function (params) {
                        return {
                            q: params
                        };
                    },
                    results: function (data) {
                        var user_list = [], users = data['users'];

                        for (var i = 0, len = users.length; i < len; i++) {
                            user_list.push({ // 'id' & 'text' are required by the plugin
                                "id": users[i].email,
                                // for search. both name & email can be searched.
                                // use ' '(space) to separate name & email
                                "text": users[i].name + ' ' + users[i].email,
                                "avatar": users[i].avatar,
                                "name": users[i].name
                            });
                        }

                        return {
                            results: user_list
                        };
                    }
                },

                // format items shown in the drop-down menu
                formatResult: function(item) {
                    if (item.avatar) {
                        return item.avatar + '<span class="text ellipsis">' + _this.HTMLescape(item.name) + '<br />' + _this.HTMLescape(item.id) + '</span>';
                    } else {
                        return; // if no match, show nothing
                    }
                },

                // format selected item shown in the input
                formatSelection: function(item) {
                    return _this.HTMLescape(item.name || item.id); // if no name, show the email, i.e., when directly input, show the email
                },
                escapeMarkup: function(m) { return m; }
            }
        },

        // check if a file is an image
        imageCheck: function (filename) {
            // no file ext
            if (filename.lastIndexOf('.') == -1) {
                return false;
            }
            var file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            var image_exts = ['gif', 'jpeg', 'jpg', 'png', 'ico', 'bmp'];
            if (image_exts.indexOf(file_ext) != -1) {
                return true;
            } else {
                return false;
            }
        },

        compareTwoWord: function(a_name, b_name) {
            // compare a_name and b_name at lower case
            // if a_name >= b_name, return 1
            // if a_name < b_name, return -1

            var a_val, b_val,
                a_uni = a_name.charCodeAt(0),
                b_uni = b_name.charCodeAt(0),
                strChineseFirstPY = this.strChineseFirstPY;

            if ((19968 < a_uni && a_uni < 40869) && (19968 < b_uni && b_uni < 40869)) {
                // both are chinese words
                a_val = strChineseFirstPY.charAt(a_uni - 19968).toLowerCase();
                b_val = strChineseFirstPY.charAt(b_uni - 19968).toLowerCase();
            } else if ((19968 < a_uni && a_uni < 40869) && !(19968 < b_uni && b_uni < 40869)) {
                // a is chinese and b is english
                return 1;
            } else if (!(19968 < a_uni && a_uni < 40869) && (19968 < b_uni && b_uni < 40869)) {
                // a is english and b is chinese
                return -1;
            } else {
                // both are english words
                a_val = a_name.toLowerCase();
                b_val = b_name.toLowerCase();
            }

            return a_val >= b_val ? 1 : -1;
        },

        fileSizeFormat: function(bytes, precision) {
            var kilobyte = 1024;
            var megabyte = kilobyte * 1024;
            var gigabyte = megabyte * 1024;
            var terabyte = gigabyte * 1024;

            var precision = precision || 0;

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

    }
});

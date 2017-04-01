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
        'backbone.paginator': {
            deps: [
                'backbone'
            ],
            exports: 'BackbonePaginator'
        }
    },
    paths: {
        'jquery': 'lib/jquery',
        'jquery.ui.core': 'lib/jquery.ui.core',
        'jquery.ui.widget': 'lib/jquery.ui.widget.1.11.1',
        'jquery.ui.progressbar': 'lib/jquery.ui.progressbar',
        'jquery.ui.tabs': 'lib/jquery.ui.tabs',

        // for fileupload
        'tmpl': 'lib/tmpl.min',
        'jquery.iframe-transport': 'lib/jquery.iframe-transport',
        'jquery.fileupload': 'lib/jquery.fileupload',
        'jquery.fileupload-process': 'lib/jquery.fileupload-process',
        'jquery.fileupload-validate': 'lib/jquery.fileupload-validate',
        'jquery.fileupload-ui': 'lib/jquery.fileupload-ui',

        'jquery.magnific-popup': 'lib/jquery.magnific-popup',

        'js.cookie': 'lib/js.cookie',

        simplemodal: 'lib/jquery.simplemodal',
        jstree: 'lib/jstree.min',
        select2: 'lib/select2-3.5.2',
        moment: 'lib/moment-with-locales',
        marked: 'lib/marked.min',

        underscore: 'lib/underscore',
        backbone: 'lib/backbone',
        'backbone.paginator': 'lib/backbone.paginator',
        text: 'lib/text'
    }
});

define([
    'jquery',
    'underscore',
    'text',                     // Workaround for r.js, otherwise text.js will not be included
    'pinyin-by-unicode',
    'moment',
    'js.cookie'
], function($, _, text, PinyinByUnicode, Moment, Cookies) {
    return {
        INFO_TIMEOUT: 10000,     // 10 secs for info msg
        SUCCESS_TIMEOUT: 3000,   // 3 secs for success msg
        ERROR_TIMEOUT: 3000,     // 3 secs for error msg

        strChineseFirstPY: PinyinByUnicode.strChineseFirstPY,

        getUrl: function(options) {
            var siteRoot = app.config.siteRoot;
            var fileServerRoot = app.config.fileServerRoot;
            switch (options.name) {
                // File Operations
                case 'list_lib_dir': return siteRoot + 'ajax/lib/' + options.repo_id + '/dir/';
                case 'del_dir': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/dir/';
                case 'del_file': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/file/';
                case 'download_dir_zip_url': return fileServerRoot + 'zip/' + options.zip_token;
                case 'zip_task': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/zip-task/';
                case 'query_zip_progress': return siteRoot + 'api/v2.1/query-zip-progress/';
                case 'copy_move_task': return siteRoot + 'api/v2.1/copy-move-task/';
                case 'query_copy_move_progress': return siteRoot + 'api/v2.1/query-copy-move-progress/';
                case 'rename_dir': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/dir/';
                case 'rename_file': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/file/';
                case 'lock_or_unlock_file': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/file/';
                case 'new_dir': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/dir/';
                case 'new_file': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/file/';
                case 'del_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/delete/';
                case 'mv_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/move/';
                case 'cp_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/copy/';
                case 'get_dirents': return siteRoot + 'ajax/repo/' + options.repo_id + '/dirents/';

                // Repos
                case 'repos': return siteRoot + 'api2/repos/';
                case 'pub_repos': return siteRoot + 'api2/repos/public/';
                case 'unenc_rw_repos': return siteRoot + 'ajax/unenc-rw-repos/';
                case 'api_v2.1_repo_set_password': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/set-password/';
                case 'get_history_changes': return siteRoot + 'ajax/repo/' + options.repo_id + '/history/changes/';
                case 'beshared_repo': return siteRoot + 'api2/beshared-repos/' + options.repo_id + '/';
                case 'dir_shared_items': return siteRoot + 'api2/repos/' + options.repo_id + '/dir/shared_items/';
                case 'shared_repos': return siteRoot + 'api2/shared-repos/' + options.repo_id + '/';
                case 'repo': return siteRoot + 'api2/repos/' + options.repo_id + '/';
                case 'repo_owner': return siteRoot + 'api2/repos/' + options.repo_id + '/owner/';
                case 'repo_history_limit': return siteRoot + 'api2/repos/' + options.repo_id + '/history-limit/';
                case 'repo_shared_download_links': return siteRoot + 'api2/repos/' + options.repo_id + '/download-shared-links/';
                case 'repo_shared_download_link': return siteRoot + 'api2/repos/' + options.repo_id + '/download-shared-links/' + options.token + '/';
                case 'repo_shared_upload_links': return siteRoot + 'api2/repos/' + options.repo_id + '/upload-shared-links/';
                case 'repo_shared_upload_link': return siteRoot + 'api2/repos/' + options.repo_id + '/upload-shared-links/' + options.token + '/';
                case 'repo_user_folder_perm': return siteRoot + 'api2/repos/' + options.repo_id + '/user-folder-perm/';
                case 'repo_group_folder_perm': return siteRoot + 'api2/repos/' + options.repo_id + '/group-folder-perm/';
                case 'repo_upload_link': return siteRoot + 'api2/repos/' + options.repo_id + '/upload-link/';
                case 'repo_update_link': return siteRoot + 'api2/repos/' + options.repo_id + '/update-link/';

                case 'repo_file_uploaded_bytes': return siteRoot + 'api/v2.1/repos/' + options.repo_id + '/file-uploaded-bytes/';

                // Share admin
                case 'share_admin_repos': return siteRoot + 'api/v2.1/shared-repos/';
                case 'share_admin_repo': return siteRoot + 'api/v2.1/shared-repos/' + options.repo_id + '/';
                case 'share_admin_folders': return siteRoot + 'api/v2.1/shared-folders/';
                case 'share_admin_share_links': return siteRoot + 'api/v2.1/share-links/';
                case 'share_admin_share_link': return siteRoot + 'api/v2.1/share-links/' + options.token + '/';
                case 'share_admin_upload_links': return siteRoot + 'api/v2.1/upload-links/';
                case 'share_admin_upload_link': return siteRoot + 'api/v2.1/upload-links/' + options.token + '/';

                // Links
                case 'send_shared_download_link': return siteRoot + 'share/link/send/';
                case 'send_shared_upload_link': return siteRoot + 'share/upload_link/send/';

                // Group
                case 'groups': return siteRoot + 'api/v2.1/groups/';
                case 'search_group': return siteRoot + 'api/v2.1/search-group/';
                case 'group': return siteRoot + 'api/v2.1/groups/' + options.group_id + '/';
                case 'group_members': return siteRoot + 'api/v2.1/groups/' + options.group_id + '/members/';
                case 'group_member': return siteRoot + 'api/v2.1/groups/' + options.group_id + '/members/' + options.email + '/';
                case 'group_member_bulk': return siteRoot + 'api/v2.1/groups/' + options.group_id + '/members/bulk/';
                case 'group_import_members': return siteRoot + 'ajax/group/' + options.group_id + '/members/import/';
                case 'group_repos': return siteRoot + 'api2/groups/' + options.group_id + '/repos/';
                case 'group_discussions': return siteRoot + 'api2/groups/' + options.group_id + '/discussions/';
                case 'group_discussion': return siteRoot + 'api2/groups/' + options.group_id + '/discussions/' + options.discussion_id + '/';

                // Misc
                case 'thumbnail_create': return siteRoot + 'thumbnail/' + options.repo_id + '/create/';
                case 'get_popup_notices': return siteRoot + 'ajax/get_popup_notices/';

                case 'notifications': return siteRoot + 'api/v2.1/notifications/';
                case 'notification': return siteRoot + 'api/v2.1/notification/';
                case 'user_enabled_modules': return siteRoot + 'api/v2.1/user-enabled-modules/';

                case 'starred_items': return siteRoot + 'api/v2.1/starred-items/';
                case 'events': return siteRoot + 'api2/events/';
                case 'devices': return siteRoot + 'api2/devices/';
                case 'invitations': return siteRoot + 'api/v2.1/invitations/';
                case 'invitation': return siteRoot + 'api/v2.1/invitations/' + options.token + '/';
                case 'search_user': return siteRoot + 'api2/search-user/';
                case 'user_profile': return siteRoot + 'profile/' + options.username + '/';
                case 'space_and_traffic': return siteRoot + 'ajax/space_and_traffic/';

                // sysadmin
                case 'sysinfo': return siteRoot + 'api/v2.1/admin/sysinfo/';
                case 'admin-devices': return siteRoot + 'api/v2.1/admin/devices/';
                case 'admin-device-errors': return siteRoot + 'api/v2.1/admin/device-errors/';
                case 'admin-libraries': return siteRoot + 'api/v2.1/admin/libraries/';
                case 'admin-library': return siteRoot + 'api/v2.1/admin/libraries/' + options.repo_id + '/';
                case 'admin-library-dirents': return siteRoot + 'api/v2.1/admin/libraries/' + options.repo_id + '/dirents/';
                case 'admin-groups': return siteRoot + 'api/v2.1/admin/groups/';
                case 'admin-group': return siteRoot + 'api/v2.1/admin/groups/' + options.group_id + '/';
                case 'admin-group-libraries': return siteRoot + 'api/v2.1/admin/groups/' + options.group_id + '/libraries/';
                case 'admin-group-library': return siteRoot + 'api/v2.1/admin/groups/' + options.group_id + '/libraries/' + options.repo_id + '/';
                case 'admin-group-members': return siteRoot + 'api/v2.1/admin/groups/' + options.group_id + '/members/';
                case 'admin-group-member': return siteRoot + 'api/v2.1/admin/groups/' + options.group_id + '/members/' + options.email+ '/';
                case 'admin-system-library': return siteRoot + 'api/v2.1/admin/system-library/';
                case 'admin-trash-libraries': return siteRoot + 'api/v2.1/admin/trash-libraries/';
                case 'admin-trash-library': return siteRoot + 'api/v2.1/admin/trash-libraries/' + options.repo_id + '/';
                case 'admin_shares': return siteRoot + 'api/v2.1/admin/shares/';
                case 'sys_group_admin_export_excel': return siteRoot + 'sys/groupadmin/export-excel/';
                case 'admin-logs': return siteRoot + 'api/v2.1/admin/admin-logs/';
            }
        },

        FILEEXT_ICON_MAP: {
            // text file
            'md': 'txt.png',
            'txt': 'txt.png',

            // pdf file
            'pdf' : 'pdf.png',
            // document file
            'doc' : 'word.png',
            'docx' : 'word.png',
            'ppt' : 'ppt.png',
            'pptx' : 'ppt.png',
            'xls' : 'excel.png',
            'xlsx' : 'excel.png',
            'txt' : 'txt.png',
            'odt' : 'word.png',
            'fodt' : 'word.png',
            'ods' : 'excel.png',
            'fods' : 'excel.png',
            'odp' : 'ppt.png',
            'fodp' : 'ppt.png',
            // music file
            'mp3' : 'music.png',
            'oga' : 'music.png',
            'ogg' : 'music.png',
            'flac' : 'music.png',
            'aac' : 'music.png',
            'ac3' : 'music.png',
            'wma' : 'music.png',
            // image file
            'jpg' : 'pic.png',
            'jpeg' : 'pic.png',
            'png' : 'pic.png',
            'svg' : 'pic.png',
            'gif' : 'pic.png',
            'bmp' : 'pic.png',
            'ico' : 'pic.png',
            // default
            'default' : 'file.png'
        },

        getFileIconUrl: function(filename, size) {
            if (size > 24) {
                size = 192;
            } else {
                size = 24;
            }

            var file_ext;
            if (filename.lastIndexOf('.') == -1) {
                return app.config.mediaUrl + "img/file/" + size + "/"
                    + this.FILEEXT_ICON_MAP['default'];
            } else {
                file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            }

            if (_.has(this.FILEEXT_ICON_MAP, file_ext)) {
                return app.config.mediaUrl + "img/file/" + size + "/" + this.FILEEXT_ICON_MAP[file_ext];
            } else {
                return app.config.mediaUrl + "img/file/" + size + "/" + this.FILEEXT_ICON_MAP['default'];
            }
        },

        getDirIconUrl: function(is_readonly, size) {
            if (size > 24) {
                if (is_readonly) {
                    return app.config.mediaUrl + "img/folder-read-only-192.png";
                } else {
                    return app.config.mediaUrl + "img/folder-192.png";
                }
            } else {
                if (is_readonly) {
                    return app.config.mediaUrl + "img/folder-read-only-24.png";
                } else {
                    return app.config.mediaUrl + "img/folder-24.png";
                }
            }
        },

        getLibIconUrl: function(is_encrypted, is_readonly, size) {
            if (size > 24) {
                if (is_encrypted) {
                    return app.config.mediaUrl + "img/lib/96/lib-encrypted.png";
                } else if (is_readonly) {
                    return app.config.mediaUrl + "img/lib/96/lib-readonly.png";
                } else {
                    return app.config.mediaUrl + "img/lib/96/lib.png";
                }
            } else {
                if (is_encrypted) {
                    return app.config.mediaUrl + "img/lib/24/lib-encrypted.png";
                } else if (is_readonly) {
                    return app.config.mediaUrl + "img/lib/24/lib-readonly.png";
                } else {
                    return app.config.mediaUrl + "img/lib/24/lib.png";
                }
            }
        },

        getLibIconTitle: function(is_encrypted, is_readonly) {
            if (is_encrypted) {
                return gettext("Encrypted library");
            } else if (is_readonly) {
                return gettext("Read-Only library");
            } else {
                return gettext("Read-Write library");
            }
        },

        isHiDPI: function() {
            var pixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
            if (pixelRatio > 1) {
                return true;
            } else {
                return false;
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

        confirm_with_extra_option_template: _.template($('#confirm-dialog-with-extra-option-tmpl').html()),

        showConfirmWithExtraOption: function(title, content, extraOption, yesCallback) {
            var $popup = $("#confirm-popup");
            var $cont = $('#confirm-con');
            var $yesBtn = $('#confirm-yes');

            var html = this.confirm_with_extra_option_template({
                'is_pro': app.pageOptions.is_pro,
                'title': title,
                'content': content,
                'extraOption': extraOption
            });

            $cont.html(html);
            $popup.modal({appendTo: '#main'});
            $('#simplemodal-container').css({'height':'auto'});

            $yesBtn.click(function() {
                var extraOptionChecked = $('#confirm-extra-option:checked').val() === 'on';
                yesCallback(extraOptionChecked);
            });
        },

        closeModal: function() {
            $.modal.close();
        },

        feedback: function(con, type, time) {
            var time = time || 5000;
            if ($('.messages').length > 0) {
                $('.messages').html('<li class="' + type + '">' + this.HTMLescape(con) + '</li>');
            } else {
                var html = '<ul class="messages"><li class="' + type + '">' + this.HTMLescape(con) + '</li></ul>';
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
                var parsed_resp = $.parseJSON(xhr.responseText);
                this.feedback(parsed_resp.error||parsed_resp.error_msg||parsed_resp.detail, 'error');
            } else {
                this.feedback(gettext("Failed. Please check the network."), 'error');
            }
        },

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
                        err = $.parseJSON(xhr.responseText).error||$.parseJSON(xhr.responseText).error_msg;
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
            // IE8 does not support 'map()'
            /*
            return path.split('/').map(function(e) {
                return encodeURIComponent(e);
            }).join('/');
            */

            var path_arr = path.split('/'),
                path_arr_ = [];
            for (var i = 0, len = path_arr.length; i < len; i++) {
                path_arr_.push(encodeURIComponent(path_arr[i]));
            }
            return path_arr_.join('/');
        },

        initLocale: function() {
            var language_code;
            if (app.pageOptions.language_code == 'en') {
                language_code = 'en-gb';
            } else if (app.pageOptions.language_code == 'es-ar' || app.pageOptions.language_code == 'es-mx') {
                language_code = 'es';
            } else {
                language_code = app.pageOptions.language_code;
            }
            Moment.locale(language_code);
        },

        getRelativeTimeStr: function(m) {
            var now = new Date();
            if (m - now > 0) {
                return gettext("Just now");
            } else {
                return m.fromNow();
            }
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
                placeholder: gettext("Search users or enter emails and press Enter"),

                // with 'tags', the user can directly enter, not just select
                // tags need `<input type="hidden" />`, not `<select>`
                tags: [],

                minimumInputLength: 1, // input at least 1 character

                formatInputTooShort: gettext("Please enter 1 or more character"),
                formatNoMatches: gettext("No matches"),
                formatSearching: gettext("Searching..."),
                formatAjaxError: gettext("Loading failed"),

                ajax: {
                    url: _this.getUrl({name: 'search_user'}),
                    dataType: 'json',
                    delay: 250,
                    cache: true,
                    data: function(params) {
                        return {
                            q: params
                        };
                    },
                    results: function(data) {
                        var user_list = [], users = data['users'];

                        for (var i = 0, len = users.length; i < len; i++) {
                            user_list.push({ // 'id' & 'text' are required by the plugin
                                "id": users[i].email,
                                // for search. both name & email can be searched.
                                // use ' '(space) to separate name & email
                                "text": users[i].name + ' ' + users[i].contact_email,
                                "avatar_url": users[i].avatar_url,
                                "contact_email": users[i].contact_email,
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
                    if (item.avatar_url) {
                        return '<img src="' + item.avatar_url + '" width="32" height="32" class="avatar"><span class="text ellipsis">' + _this.HTMLescape(item.name) + '<br />' + _this.HTMLescape(item.contact_email) + '</span>';
                    } else {
                        return; // if no match, show nothing
                    }
                },

                // format selected item shown in the input
                formatSelection: function(item) {
                    return _this.HTMLescape(item.name || item.id); // if no name, show the email, i.e., when directly input, show the email
                },

                createSearchChoice: function(term) {
                    return {
                        'id': $.trim(term)
                    };
                },

                escapeMarkup: function(m) { return m; }
            }
        },

        groupInputOptionsForSelect2: function() {
            var _this = this;
            return {
                placeholder: gettext("Search groups"),

                // with 'tags', the user can directly enter, not just select
                // tags need `<input type="hidden" />`, not `<select>`
                tags: [],

                minimumInputLength: 1, // input at least 1 character

                formatInputTooShort: gettext("Please enter 1 or more character"),
                formatNoMatches: gettext("No matches"),
                formatSearching: gettext("Searching..."),
                formatAjaxError: gettext("Loading failed"),

                ajax: {
                    url: _this.getUrl({name: 'search_group'}),
                    dataType: 'json',
                    delay: 250,
                    cache: true,
                    data: function(params) {
                        return {
                            q: params
                        };
                    },
                    results: function(data) {
                        var group_list = [], groups = data;

                        for (var i = 0, len = groups.length; i < len; i++) {
                            group_list.push({ // 'id' & 'text' are required by the plugin
                                "id": groups[i].id,
                                "text": groups[i].name,
                                "name": groups[i].name
                            });
                        }

                        return {
                            results: group_list
                        };
                    }
                },

                // format items shown in the drop-down menu
                formatResult: function(item) {
                    if (item.name) {
                        return '<span class="text ellipsis">' + _this.HTMLescape(item.name) + '</span>';
                    } else {
                        return; // if no match, show nothing
                    }
                },

                // format selected item shown in the input
                formatSelection: function(item) {
                    return _this.HTMLescape(item.name);
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
                return this.compareStrWithNumbersIn(a_val, b_val);
            }

            return a_val >= b_val ? 1 : -1;
        },

        // compare two strings which may have digits in them
        // and compare those digits as number instead of string
        compareStrWithNumbersIn: function(a, b) {
            var reParts = /\d+|\D+/g;
            var reDigit = /\d/;
            var aParts = a.match(reParts);
            var bParts = b.match(reParts);
            var isDigitPart;
            var len = Math.min(aParts.length, bParts.length);
            var aPart, bPart;

            if (aParts && bParts &&
                (isDigitPart = reDigit.test(aParts[0])) == reDigit.test(bParts[0])) {
                // Loop through each substring part to compare the overall strings.
                for (var i = 0; i < len; i++) {
                    aPart = aParts[i];
                    bPart = bParts[i];

                    if (isDigitPart) {
                        aPart = parseInt(aPart, 10);
                        bPart = parseInt(bPart, 10);
                    }

                    if (aPart != bPart) {
                        return aPart < bPart ? -1 : 1;
                    }

                    // Toggle the value of isDigitPart since the parts will alternate.
                    isDigitPart = !isDigitPart;
                }
            }

            // Use normal comparison.
            return (a >= b) - (a <= b);
        },

        toggleSortByNameMode: function() {
            if (app.pageOptions.sort_mode == 'name_up') {
                Cookies.set('sort_mode', 'name_down');
                app.pageOptions.sort_mode = 'name_down';
            } else {
                Cookies.set('sort_mode', 'name_up');
                app.pageOptions.sort_mode = 'name_up';
            }
        },

        toggleSortByTimeMode: function() {
            if (app.pageOptions.sort_mode == 'time_down') {
                Cookies.set('sort_mode', 'time_up');
                app.pageOptions.sort_mode = 'time_up';
            } else {
                Cookies.set('sort_mode', 'time_down');
                app.pageOptions.sort_mode = 'time_down';
            }
        },

        updateSortIconByMode: function(options) {
            var sort_mode = app.pageOptions.sort_mode;

            var context = options.context;
            var $byNameIcon = $('.by-name .sort-icon', context),
                $byTimeIcon = $('.by-time .sort-icon', context);

            // hide icons
            $byNameIcon.hide();
            $byTimeIcon.hide();

            // show icon according sort mode
            switch(sort_mode) {
                case 'name_down':
                    $byNameIcon.removeClass('icon-caret-up').addClass('icon-caret-down').show();
                    break;
                case 'name_up':
                    $byNameIcon.removeClass('icon-caret-down').addClass('icon-caret-up').show();
                    break;
                case 'time_down':
                    $byTimeIcon.removeClass('icon-caret-up').addClass('icon-caret-down').show();
                    break;
                case 'time_up':
                    $byTimeIcon.removeClass('icon-caret-down').addClass('icon-caret-up').show();
                    break;
                default:
                    $byNameIcon.removeClass('icon-caret-down').addClass('icon-caret-up').show();
                    break;
            }
        },

        sortLibs: function(options) {
            var _this = this;
            var sort_mode = app.pageOptions.sort_mode;
            var libs = options.libs;

            switch(sort_mode) {
                case 'name_up': // name of a broken library is null
                    libs.comparator = function(a, b) {
                        if (!a.get('name')) {
                            return 1;
                        }
                        if (!b.get('name')) {
                            return -1;
                        }
                        var result = _this.compareTwoWord(a.get('name'), b.get('name'));
                        return result;
                    };
                    break;
                case 'name_down':
                    libs.comparator = function(a, b) {
                        if (!a.get('name')) {
                            return -1;
                        }
                        if (!b.get('name')) {
                            return 1;
                        }
                        var result = _this.compareTwoWord(a.get('name'), b.get('name'));
                        return -result;
                    };
                    break;
                case 'time_up':
                    libs.comparator = function(a, b) {
                        return a.get('mtime') < b.get('mtime') ? -1 : 1;
                    };
                    break;
                case 'time_down':
                    libs.comparator = function(a, b) {
                        return a.get('mtime') < b.get('mtime') ? 1 : -1;
                    };
                    break;
            }
            libs.sort();
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
        },

        quotaSizeFormat: function(bytes, precision) {
            var kilobyte = 1000;
            var megabyte = kilobyte * 1000;
            var gigabyte = megabyte * 1000;
            var terabyte = gigabyte * 1000;

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
        },

        groupId2Name: function(group_id) {
            var group_name;
            var groups = app.pageOptions.groups;
            for (var i = 0, len = groups.length; i < len; i++) {
                if (group_id == groups[i].id) {
                    group_name = groups[i].name;
                    break;
                }
            }
            return group_name;
        },

        setCaretPosition:function(input, pos) {
            var range;
            if (document.selection) {
                range = input.createTextRange();
                range.move("character", pos);
                return range.select();
            } else {
                return input.setSelectionRange(pos, pos);
            }
        },

        // for 'dir view': download multi dirents; dir download
        zipDownload:function(repo_id, parent_dir, dirents) {
            var _this = this;

            var interval;
            var zip_token;
            var packagingTip = gettext("Packaging...");
            var $tip = $('<p></p>');
            var queryZipProgress = function() {
                $.ajax({
                    url: _this.getUrl({name: 'query_zip_progress'}) + '?token=' + zip_token,
                    dataType: 'json',
                    cache: false,
                    success: function(data) {
                        var progress = data.total == 0 ? '100%' : (data.zipped/data.total*100).toFixed(0) + '%';
                        $tip.html(packagingTip + ' ' + progress);
                        if (data['total'] == data['zipped']) {
                            setTimeout(function() { $.modal.close(); }, 500);
                            clearInterval(interval);
                            location.href = _this.getUrl({
                                name: 'download_dir_zip_url',
                                zip_token: zip_token
                            });
                        }
                    },
                    error: function(xhr) {
                        _this.ajaxErrorHandler(xhr);
                        clearInterval(interval);
                    }
                });
            };

            $.ajax({
                url: _this.getUrl({
                    name: 'zip_task',
                    repo_id: repo_id
                }),
                data: {
                    'parent_dir': parent_dir,
                    'dirents': dirents
                },
                traditional: true,
                dataType: 'json',
                success: function(data) {
                    zip_token = data['zip_token'];
                    $tip.html(packagingTip).modal();
                    $('#simplemodal-container').css({'width':'auto'});
                    queryZipProgress();
                    interval = setInterval(queryZipProgress, 1000);
                },
                error: function(xhr) {
                    _this.ajaxErrorHandler(xhr);
                }
            });
        }
    }
});

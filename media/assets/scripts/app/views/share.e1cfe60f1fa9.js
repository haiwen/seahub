define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/folder-share-item'
], function($, _, Backbone, Common, FolderShareItemView) {
    'use strict';

    var SharePopupView = Backbone.View.extend({
        tagName: 'div',
        id: 'share-popup',
        template: _.template($('#share-popup-tmpl').html()),

        initialize: function(options) {
            this.is_repo_owner = options.is_repo_owner;
            this.is_virtual = options.is_virtual;
            this.user_perm = options.user_perm;
            this.repo_id = options.repo_id;
            this.repo_encrypted = options.repo_encrypted;
            this.dirent_path = options.dirent_path;
            this.obj_name = options.obj_name;
            this.is_dir = options.is_dir;

            this.render();

            this.$el.modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$("#share-tabs").tabs();

            if (!this.repo_encrypted) {
                this.downloadLinkPanelInit();
            }
            if (this.is_dir) {
                if (this.user_perm == 'rw' && !this.repo_encrypted) {
                    this.uploadLinkPanelInit();
                }
                if (!this.is_virtual && this.is_repo_owner) {
                    this.dirUserSharePanelInit();
                    this.dirGroupSharePanelInit();

                    var _this = this;
                    $(document).on('click', function(e) {
                        var target = e.target || event.srcElement;
                        if (!_this.$('.perm-edit-icon, .perm-toggle-select').is(target)) {
                            _this.$('.perm').removeClass('hide');
                            _this.$('.perm-toggle-select').addClass('hide');
                        }
                    });
                }
            }
        },

        render: function () {
            this.$el.html(this.template({
                title: gettext("Share {placeholder}")
                    .replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(this.obj_name) + '">' + Common.HTMLescape(this.obj_name) + '</span>'),
                is_dir: this.is_dir,
                is_repo_owner: this.is_repo_owner,
                is_virtual: this.is_virtual,
                user_perm: this.user_perm,
                repo_id: this.repo_id,
                repo_encrypted: this.repo_encrypted
            }));

            return this;
        },

        events: {
            'click [type="checkbox"]': 'clickCheckbox',

            // download link
            'submit #generate-download-link-form': 'generateDownloadLink',
            'click #send-download-link': 'showDownloadLinkSendForm',
            'submit #send-download-link-form': 'sendDownloadLink',
            'click #cancel-share-download-link': 'cancelShareDownloadLink',
            'click #delete-download-link': 'deleteDownloadLink',
            'click #generate-download-link-form .generate-random-password': 'generateRandomDownloadPassword',
            'keydown #generate-download-link-form .generate-random-password': 'generateRandomDownloadPassword',
            'click #generate-download-link-form .show-or-hide-password': 'showOrHideDownloadPassword',
            'keydown #generate-download-link-form .show-or-hide-password': 'showOrHideDownloadPassword',

            // upload link
            'submit #generate-upload-link-form': 'generateUploadLink',
            'click #send-upload-link': 'showUploadLinkSendForm',
            'submit #send-upload-link-form': 'sendUploadLink',
            'click #cancel-share-upload-link': 'cancelShareUploadLink',
            'click #delete-upload-link': 'deleteUploadLink',
            'click #generate-upload-link-form .generate-random-password': 'generateRandomUploadPassword',
            'keydown #generate-upload-link-form .generate-random-password': 'generateRandomUploadPassword',
            'click #generate-upload-link-form .show-or-hide-password': 'showOrHideUploadPassword',
            'keydown #generate-upload-link-form .show-or-hide-password': 'showOrHideUploadPassword',

            // dir private share
            'click #add-dir-user-share-item .submit': 'dirUserShare',
            'click #add-dir-group-share-item .submit': 'dirGroupShare'
        },

        clickCheckbox: function(e) {
            var $el = $(e.currentTarget);
            // for link options such as 'password', 'expire'
            $el.closest('.checkbox-label').next().toggleClass('hide');
        },

        downloadLinkPanelInit: function() {
            var _this = this;
            var after_op_success = function(data) { // data is [] or [{...}] 

                _this.$('.loading-tip').hide();

                if (data.length == 1) {
                    var link_data = data[0],
                        link = link_data.link;
                    _this.download_link = link; // for 'link send'
                    _this.download_link_token = link_data.token; // for 'link delete'
                    _this.$('#download-link').html(link);
                    _this.$('#direct-dl-link').html(link + '?raw=1');
                    if (link_data.is_expired) {
                        _this.$('#send-download-link').addClass('hide');
                        _this.$('#download-link, #direct-dl-link').append(' <span class="error">(' + gettext('Expired') + ')</span>');
                    }
                    _this.$('#download-link-operations').removeClass('hide');
                } else {
                    _this.$('#generate-download-link-form').removeClass('hide');
                }
            };
            // check if downloadLink exists
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'share_admin_share_links'}),
                'data': {
                    'repo_id': this.repo_id,
                    'path': this.dirent_path
                },
                'after_op_success': after_op_success
            });
        },

        generateRandomPassword: function(e, form) {
            if (e.type == 'keydown' && e.which != 32) { // enable only Space key
                return;
            }

            var random_password_length = app.pageOptions.share_link_password_min_length;
            var random_password = '';
            var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789';
            for (var i = 0; i < random_password_length; i++) {
                random_password += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            $('input[name=password], input[name=password_again]', form).attr('type', 'text').val(random_password);
            $('.show-or-hide-password', form)
            .attr('title', gettext('Hide'))
            .attr('aria-label', gettext('Hide'))
            .removeClass('icon-eye').addClass('icon-eye-slash');
        },

        generateRandomDownloadPassword: function(e) {
            this.generateRandomPassword(e, $('#generate-download-link-form'));
        },

        showOrHidePassword: function(e, form) {
            if (e.type == 'keydown' && e.which != 32) { // enable only Space key
                return;
            }

            var icon = $('.show-or-hide-password', form),
                passwd_input = $('input[name=password], input[name=password_again]', form);
            icon.toggleClass('icon-eye icon-eye-slash');
            if (icon.hasClass('icon-eye')) {
                icon.attr('title', gettext('Show'));
                icon.attr('aria-label', gettext('Show'));
                passwd_input.attr('type', 'password');
            } else {
                icon.attr('title', gettext('Hide'));
                icon.attr('aria-label', gettext('Hide'));
                passwd_input.attr('type', 'text');
            }
        },

        showOrHideDownloadPassword: function(e) {
            this.showOrHidePassword(e, $('#generate-download-link-form'));
        },

        generateLink: function(options) {
            var link_type = options.link_type, // 'download' or 'upload'
                form = options.form,
                form_id = form.attr('id'),
                use_passwd_checkbox = $('[name="use_passwd"]', form),
                use_passwd = use_passwd_checkbox.prop('checked');
            if (link_type == 'download') {
                var set_expiration_checkbox = $('[name="set_expiration"]', form),
                    set_expiration = set_expiration_checkbox.prop('checked');
            }
            var post_data = {};

            if (use_passwd) {
                var passwd_input = $('[name="password"]', form),
                    passwd_again_input = $('[name="password_again"]', form),
                    passwd = $.trim(passwd_input.val()),
                    passwd_again = $.trim(passwd_again_input.val());
                if (!passwd) {
                    Common.showFormError(form_id, gettext("Please enter password"));
                    return false;
                }
                if (passwd.length < app.pageOptions.share_link_password_min_length) {
                    Common.showFormError(form_id, gettext("Password is too short"));
                    return false;
                }
                if (!passwd_again) {
                    Common.showFormError(form_id, gettext("Please enter the password again"));
                    return false;
                }
                if (passwd != passwd_again) {
                    Common.showFormError(form_id, gettext("Passwords don't match"));
                    return false;
                }
                post_data["use_passwd"] = 1;
                post_data["passwd"] = passwd;
            } else {
                post_data["use_passwd"] = 0;
            }

            if (set_expiration) { // for upload link, 'set_expiration' is undefined
                var expire_days_input = $('[name="expire_days"]', form),
                    expire_days = $.trim(expire_days_input.val());
                if (!expire_days) {
                    Common.showFormError(form_id, gettext("Please enter days."));
                    return false;
                }
                if (Math.floor(expire_days) != expire_days || !$.isNumeric(expire_days)) {
                    Common.showFormError(form_id, gettext("Please enter valid days"));
                    return false;
                };
                post_data["expire_days"] = expire_days;
            }

            $('.error', form).addClass('hide').html('');
            var gen_btn = $('[type="submit"]', form);
            Common.disableButton(gen_btn);

            $.extend(post_data, {
                'repo_id': this.repo_id,
                'path': this.dirent_path
            });

            var _this = this;
            var after_op_success = function(data) {
                form.addClass('hide');
                // restore form state
                Common.enableButton(gen_btn);
                if (use_passwd) {
                    use_passwd_checkbox.prop('checked', false)
                        .parent().removeClass('checkbox-checked')
                        // hide password input
                        .end().closest('.checkbox-label').next().addClass('hide');
                    passwd_input.val('');
                    passwd_again_input.val('');
                }
                if (set_expiration) {
                    set_expiration_checkbox.prop('checked', false)
                        .parent().removeClass('checkbox-checked')
                        // hide 'day' input
                        .end().closest('.checkbox-label').next().addClass('hide');
                    expire_days_input.val('');
                }

                if (link_type == 'download') {
                    _this.$('#download-link').html(data["link"]); // TODO: add 'click & select' func
                    _this.$('#direct-dl-link').html(data['link'] + '?raw=1');
                    _this.download_link = data["link"]; // for 'link send'
                    _this.download_link_token = data["token"]; // for 'link delete'
                    _this.$('#download-link-operations').removeClass('hide');
                } else {
                    _this.$('#upload-link').html(data["link"]);
                    _this.upload_link = data["link"];
                    _this.upload_link_token = data["token"];
                    _this.$('#upload-link-operations').removeClass('hide');
                }
            };

            Common.ajaxPost({
                'form': form,
                'post_url': options.post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'form_id': form_id
            });
        },

        generateDownloadLink: function() {
            this.generateLink({
                link_type: 'download',
                form: this.$('#generate-download-link-form'),
                post_url: Common.getUrl({name: 'share_admin_share_links'})
            });
            return false;
        },

        showDownloadLinkSendForm: function() {
            this.$('#send-download-link, #delete-download-link').addClass('hide');
            this.$('#send-download-link-form').removeClass('hide');
            // no addAutocomplete for email input
        },

        sendLink: function(options) {
            // options: {form:$obj, other_post_data:{}, post_url:''}
            var form = options.form,
                form_id = form.attr('id'),
                email = $.trim($('[name="email"]', form).val()),
                extra_msg = $('textarea[name="extra_msg"]', form).val();

            if (!email) {
                Common.showFormError(form_id, gettext("Please input at least an email."));
                return false;
            };

            var submit_btn = $('[type="submit"]', form);
            var sending_tip = $('.sending-tip', form);
            Common.disableButton(submit_btn);
            sending_tip.removeClass('hide');

            var post_data = {
                email: email,
                extra_msg: extra_msg
            };
            $.extend(post_data, options.other_post_data);

            var after_op_success = function(data) {
                $.modal.close();
                var msg = gettext("Successfully sent to {placeholder}")
                    .replace('{placeholder}', data['send_success'].join(', '));
                Common.feedback(msg, 'success');
                if (data['send_failed'].length > 0) {
                    msg += '<br />' + gettext("Failed to send to {placeholder}")
                        .replace('{placeholder}', data['send_failed'].join(', '));
                    Common.feedback(msg, 'info');
                }
            };
            var after_op_error = function(xhr) {
                sending_tip.addClass('hide');
                Common.enableButton(submit_btn);
                var err;
                if (xhr.responseText) {
                    err = $.parseJSON(xhr.responseText).error;
                } else {
                    err = gettext("Failed. Please check the network.");
                }
                Common.showFormError(form_id, err);
                Common.enableButton(submit_btn);
            };

            Common.ajaxPost({
                'form': form,
                'post_url': options.post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'after_op_error': after_op_error,
                'form_id': form_id
            });
        },

        sendDownloadLink: function() {
            this.sendLink({
                form: this.$('#send-download-link-form'),
                other_post_data: {
                    file_shared_link: this.download_link,
                    file_shared_name: this.obj_name,
                    file_shared_type: this.is_dir ? 'd' : 'f'
                },
                post_url: Common.getUrl({name: 'send_shared_download_link'})
            });
            return false;
        },

        cancelShareDownloadLink: function() {
            this.$('#send-download-link, #delete-download-link').removeClass('hide');
            this.$('#send-download-link-form').addClass('hide');
        },

        deleteDownloadLink: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'share_admin_share_link',
                    'token': this.download_link_token
                }),
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function(data) {
                    _this.$('#generate-download-link-form').removeClass('hide');
                    _this.$('#download-link-operations').addClass('hide');
                }
            });
        },

        uploadLinkPanelInit: function() {
            var _this = this;
            var after_op_success = function(data) { // data is [] or [{...}]
                if (data.length == 1) {
                    var link_data = data[0],
                        link = link_data.link;
                    _this.upload_link_token = link_data.token;
                    _this.upload_link = link;
                    _this.$('#upload-link').html(link);
                    _this.$('#upload-link-operations').removeClass('hide');
                } else {
                    _this.$('#generate-upload-link-form').removeClass('hide');
                }
            };
            // check if upload link exists
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'share_admin_upload_links'}),
                'data': {
                    'repo_id': this.repo_id,
                    'path': this.dirent_path
                },
                'after_op_success': after_op_success
            });
        },

        generateRandomUploadPassword: function(e) {
            this.generateRandomPassword(e, $('#generate-upload-link-form'));
        },

        showOrHideUploadPassword: function(e) {
            this.showOrHidePassword(e, $('#generate-upload-link-form'));
        },

        generateUploadLink: function() {
            this.generateLink({
                link_type: 'upload',
                form: this.$('#generate-upload-link-form'),
                post_url: Common.getUrl({name: 'share_admin_upload_links'})
            });
            return false;
        },

        showUploadLinkSendForm: function() {
            this.$('#send-upload-link, #delete-upload-link').addClass('hide');
            this.$('#send-upload-link-form').removeClass('hide');
            // no addAutocomplete for email input
        },

        sendUploadLink: function() {
            this.sendLink({
                form: this.$('#send-upload-link-form'),
                other_post_data: {
                    shared_upload_link: this.upload_link
                },
                post_url: Common.getUrl({name: 'send_shared_upload_link'})
            });
            return false;
        },

        cancelShareUploadLink: function() {
            this.$('#send-upload-link, #delete-upload-link').removeClass('hide');
            this.$('#send-upload-link-form').addClass('hide');
        },

        deleteUploadLink: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'share_admin_upload_link',
                    'token': this.upload_link_token
                }),
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function(data) {
                    _this.$('#generate-upload-link-form').removeClass('hide');
                    _this.$('#upload-link-operations').addClass('hide');
                }
            });
        },

        dirUserSharePanelInit: function() {
            var form = this.$('#dir-user-share');

            $('[name="emails"]', form).select2($.extend({
                //width: '292px' // the container will copy class 'w100' from the original element to get width
            },Common.contactInputOptionsForSelect2()));

            // show existing items
            var $add_item = $('#add-dir-user-share-item');
            var repo_id = this.repo_id, 
                path = this.dirent_path;
            Common.ajaxGet({
                'get_url': Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                }), 
                'data': {
                    'p': path,
                    'share_type': 'user'
                },
                'after_op_success': function (data) {
                    $(data).each(function(index, item) {
                        var new_item = new FolderShareItemView({
                            'repo_id': repo_id,
                            'path': path,
                            'item_data': {
                                "user": item.user_info.name,
                                "user_name": item.user_info.nickname,
                                "perm": item.permission,
                                'for_user': true
                            }
                        }); 
                        $add_item.after(new_item.el);
                    }); 
                }
            }); 

            form.removeClass('hide');
            this.$('.loading-tip').hide();
        },

        dirGroupSharePanelInit: function() {
            var form = this.$('#dir-group-share');

            var groups = app.pageOptions.groups || [];
            var g_opts = '';
            for (var i = 0, len = groups.length; i < len; i++) {
                g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
            }
            $('[name="groups"]', form).html(g_opts).select2({
                placeholder: gettext("Select groups"),
                escapeMarkup: function(m) { return m; }
            });

            // show existing items
            var $add_item = $('#add-dir-group-share-item');
            var repo_id = this.repo_id, 
                path = this.dirent_path;
            Common.ajaxGet({
                'get_url': Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                }),
                'data': {
                    'p': path,
                    'share_type': 'group'
                },
                'after_op_success': function (data) {
                    $(data).each(function(index, item) {
                        var new_item = new FolderShareItemView({
                            'repo_id': repo_id,
                            'path': path,
                            'item_data': {
                                "group_id": item.group_info.id,
                                "group_name": item.group_info.name,
                                "perm": item.permission,
                                'for_user': false
                            }
                        });
                        $add_item.after(new_item.el);
                    });
                }   
            }); 

            form.removeClass('hide');
            this.$('.loading-tip').hide();
        },

        dirUserShare: function () {
            var $panel = $('#dir-user-share');
            var $form = this.$('#add-dir-user-share-item'); // pseudo form

            var emails_input = $('[name="emails"]', $form),
                emails = emails_input.val(); // string
            if (!emails) {
                return false;
            }

            var $add_item = $('#add-dir-user-share-item');
            var repo_id = this.repo_id, 
                path = this.dirent_path;
            var $perm = $('[name="permission"]', $form);
            var perm = $perm.val();
            var $error = $('.error', $panel); 
            var $submitBtn = $('[type="submit"]', $form); 

            Common.disableButton($submitBtn);
            $.ajax({
                url: Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                }) + '?p=' + encodeURIComponent(path),
                dataType: 'json',
                method: 'PUT',
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: {
                    'share_type': 'user',
                    'username': emails.split(','),
                    'permission': perm
                },
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var new_item = new FolderShareItemView({
                                'repo_id': repo_id,
                                'path': path,
                                'item_data': {
                                    "user": item.user_info.name,
                                    "user_name": item.user_info.nickname,
                                    "perm": item.permission,
                                    'for_user': true
                                }
                            });
                            $add_item.after(new_item.el);
                        });
                        emails_input.select2("val", "");
                        $('[value="rw"]', $perm).attr('selected', 'selected');
                        $('[value="r"]', $perm).removeAttr('selected');
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var err_msg = '';
                        $(data.failed).each(function(index, item) {
                            err_msg += Common.HTMLescape(item.email) + ': ' + item.error_msg + '<br />';
                        });
                        $error.html(err_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        var parsed_resp = $.parseJSON(xhr.responseText);
                        err_msg = parsed_resp.error||parsed_resp.error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.")
                    }
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });
        },

        dirGroupShare: function () {
            var $panel = $('#dir-group-share');
            var $form = this.$('#add-dir-group-share-item'); // pseudo form

            var $groups_input = $('[name="groups"]', $form),
                groups = $groups_input.val(); // null or [group.id]

            if (!groups) {
                return false;
            }

            var $add_item = $('#add-dir-group-share-item');
            var repo_id = this.repo_id, 
                path = this.dirent_path;
            var $perm = $('[name="permission"]', $form),
                perm = $perm.val();
            var $error = $('.error', $panel); 
            var $submitBtn = $('[type="submit"]', $form); 

            Common.disableButton($submitBtn);
            $.ajax({
                url: Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                }) + '?p=' + encodeURIComponent(path),
                dataType: 'json',
                method: 'PUT',
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: {
                    'share_type': 'group',
                    'group_id': groups,
                    'permission': perm
                },
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var new_item = new FolderShareItemView({
                                'repo_id': repo_id,
                                'path': path,
                                'item_data': {
                                    "group_id": item.group_info.id,
                                    "group_name": item.group_info.name,
                                    "perm": item.permission,
                                    'for_user': false
                                }
                            });
                            $add_item.after(new_item.el);
                        });
                        $groups_input.select2("val", "");
                        $('[value="rw"]', $perm).attr('selected', 'selected');
                        $('[value="r"]', $perm).removeAttr('selected');
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var err_msg = '';
                        $(data.failed).each(function(index, item) {
                            err_msg += Common.HTMLescape(item.group_name) + ': ' + item.error_msg + '<br />';
                        });
                        $error.html(err_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        var parsed_resp = $.parseJSON(xhr.responseText);
                        err_msg = parsed_resp.error||parsed_resp.error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.")
                    }
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });
        }

    });

    return SharePopupView;
});

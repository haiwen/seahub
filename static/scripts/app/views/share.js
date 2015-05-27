define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.ui.tabs',
    'select2'
], function($, _, Backbone, Common, Tabs, Select2) {
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

            this.$el.modal({
                appendTo: "#main",
                focus: false,
                containerCss: {"padding": 0}
            });
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$("#share-tabs").tabs();

            if (!this.repo_encrypted) {
                this.downloadLinkPanelInit();
            }
            if (!this.is_dir && this.is_repo_owner) {
                this.filePrivateSharePanelInit();
            }
            if (this.is_dir) {
                if (this.user_perm == 'rw' && !this.repo_encrypted) {
                    this.uploadLinkPanelInit();
                }
                if (!this.is_virtual && this.is_repo_owner) {
                    this.dirPrivateSharePanelInit();
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
            'mouseenter .checkbox-label': 'highlightCheckbox',
            'mouseleave .checkbox-label': 'rmHighlightCheckbox',
            'click .checkbox-orig': 'clickCheckbox',

            // download link
            'submit #generate-download-link-form': 'generateDownloadLink',
            'click #send-download-link': 'showDownloadLinkSendForm',
            'submit #send-download-link-form': 'sendDownloadLink',
            'click #cancel-share-download-link': 'cancelShareDownloadLink',
            'click #delete-download-link': 'deleteDownloadLink',

            // upload link
            'submit #generate-upload-link-form': 'generateUploadLink',
            'click #send-upload-link': 'showUploadLinkSendForm',
            'submit #send-upload-link-form': 'sendUploadLink',
            'click #cancel-share-upload-link': 'cancelShareUploadLink',
            'click #delete-upload-link': 'deleteUploadLink',

            // file private share
            'submit #file-private-share-form': 'filePrivateShare',

            // dir private share
            'submit #dir-private-share-form': 'dirPrivateShare'
        },

        highlightCheckbox: function (e) {
            $(e.currentTarget).addClass('hl');
        },

        rmHighlightCheckbox: function (e) {
            $(e.currentTarget).removeClass('hl');
        },

        clickCheckbox: function(e) {
            var el = e.currentTarget;
            $(el).parent().toggleClass('checkbox-checked');
            // for link options such as 'password', 'expire'
            $(el).closest('.checkbox-label').next().toggleClass('hide');
        },

        downloadLinkPanelInit: function() {
            var _this = this;
            var after_op_success = function(data) {
                _this.$('.loading-tip').hide();
                if (data['download_link']) {
                    _this.download_link = data["download_link"]; // for 'link send'
                    _this.download_link_token = data["token"]; // for 'link delete'
                    _this.$('#download-link').html(data['download_link']); // TODO:
                    _this.$('#direct-dl-link').html(data['download_link']+'?raw=1'); // TODO:
                    _this.$('#download-link-operations').removeClass('hide');
                } else {
                    _this.$('#generate-download-link-form').removeClass('hide');
                }
            };
            // check if downloadLink exists
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_shared_download_link'}),
                'data': {
                    'repo_id': this.repo_id,
                    'p': this.dirent_path,
                    'type': this.is_dir ? 'd' : 'f'
                },
                'after_op_success': after_op_success
            });
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
                if (passwd.length < app.pageOptions.repo_password_min_length) {
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
                'p': this.dirent_path
            });
            if (link_type == 'download') {
                $.extend(post_data, {
                    'type': this.is_dir? 'd' : 'f'
                });
            }

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
                    _this.$('#download-link').html(data["download_link"]); // TODO: add 'click & select' func
                    _this.$('#direct-dl-link').html(data['download_link'] + '?raw=1');
                    _this.download_link = data["download_link"]; // for 'link send'
                    _this.download_link_token = data["token"]; // for 'link delete'
                    _this.$('#download-link-operations').removeClass('hide');
                } else {
                    _this.$('#upload-link').html(data["upload_link"]);
                    _this.upload_link = data["upload_link"];
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
                post_url: Common.getUrl({name: 'get_shared_download_link'})
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
                    .replace('{placeholder}', Common.HTMLescape(data['send_success'].join(', ')));
                Common.feedback(msg, 'success');
                if (data['send_failed'].length > 0) {
                    msg += '<br />' + gettext("Failed to send to {placeholder}")
                        .replace('{placeholder}', Common.HTMLescape(data['send_failed'].join(', ')));
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
            var after_op_success = function(data) {
                _this.$('#generate-download-link-form').removeClass('hide'),
                _this.$('#download-link-operations').addClass('hide');
            };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'delete_shared_download_link'}),
                'data': { 't': _this.download_link_token },
                'after_op_success': after_op_success
            });
        },

        uploadLinkPanelInit: function() {
            var _this = this;
            var after_op_success = function(data) {
                if (data['upload_link']) {
                    _this.upload_link_token = data["token"];
                    _this.upload_link = data["upload_link"];
                    _this.$('#upload-link').html(data["upload_link"]); // TODO
                    _this.$('#upload-link-operations').removeClass('hide');
                } else {
                    _this.$('#generate-upload-link-form').removeClass('hide');
                }
            };
            // check if upload link exists
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_share_upload_link'}), // TODO
                'data': {'repo_id': this.repo_id, 'p': this.dirent_path},
                'after_op_success': after_op_success
            });
        },

        generateUploadLink: function(e) {
            this.generateLink({
                link_type: 'upload',
                form: this.$('#generate-upload-link-form'),
                post_url: Common.getUrl({name: 'get_share_upload_link'})
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
            var after_op_success = function(data) {
                _this.$('#generate-upload-link-form').removeClass('hide'),
                _this.$('#upload-link-operations').addClass('hide');
            };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'delete_shared_upload_link'}),
                'data': { 't': _this.upload_link_token },
                'after_op_success': after_op_success
            });
        },

        filePrivateSharePanelInit: function() {
            var form = this.$('#file-private-share-form');

            $('[name="emails"]', form).select2($.extend({
                width: '400px'
            },Common.contactInputOptionsForSelect2()));

            form.removeClass('hide');
        },

        filePrivateShare: function () {
            var form = this.$('#file-private-share-form'),
                form_id = form.attr('id');

            var emails = $('[name="emails"]', form).val();
            if (!emails) {
                Common.showFormError(form_id, gettext("It is required."));
                return false;
            }

            var post_data = {
                'repo_id': this.repo_id,
                'path': this.dirent_path,
                'emails': emails
            };
            var post_url = Common.getUrl({name: 'private_share_file'});
            var after_op_success = function (data) {
                $.modal.close();
                var msg = gettext("Successfully shared to {placeholder}")
                    .replace('{placeholder}', Common.HTMLescape(data['shared_success'].join(', ')));
                Common.feedback(msg, 'success');
                if (data['shared_failed'].length > 0) {
                    msg += '<br />' + gettext("Failed to share to {placeholder}")
                        .replace('{placeholder}', Common.HTMLescape(data['shared_failed'].join(', ')));
                    Common.feedback(msg, 'info');
                }
            };

            Common.ajaxPost({
                'form': form,
                'post_url': post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'form_id': form_id
            });
            return false;
        },

        dirPrivateSharePanelInit: function() {
            // no 'share to all'
            var form = this.$('#dir-private-share-form');

            $('[name="emails"]', form).select2($.extend({
                width: '400px'
            },Common.contactInputOptionsForSelect2()));

            var groups = app.pageOptions.groups || [];
            var g_opts = '';
            for (var i = 0, len = groups.length; i < len; i++) {
                g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
            }
            $('[name="groups"]', form).html(g_opts).select2({
                placeholder: gettext("Select groups"),
                width: '400px',
                escapeMarkup: function(m) { return m; }
            });

            form.removeClass('hide');
            this.$('.loading-tip').hide();
        },

        dirPrivateShare: function () {
            var form = this.$('#dir-private-share-form'),
                form_id = form.attr('id');

            var emails = $('[name="emails"]', form).val(), // string
                groups = $('[name="groups"]', form).val(); // null or [group.id]

            if (!emails && !groups) {
                Common.showFormError(form_id, gettext("Please select a contact or a group."));
                return false;
            }

            var post_data = {
                'repo_id': this.repo_id,
                'path': this.dirent_path
            };
            if (emails) {
                post_data['emails'] = emails;
            }
            if (groups) {
                post_data['groups'] = groups.join(',');
            }
            post_data['perm'] = $('[name="permission"]', form).val();
            var post_url = Common.getUrl({name: 'private_share_dir'});
            var after_op_success = function(data) {
                $.modal.close();
                var msg = gettext("Successfully shared to {placeholder}")
                    .replace('{placeholder}', Common.HTMLescape(data['shared_success'].join(', ')));
                Common.feedback(msg, 'success');
                if (data['shared_failed'].length > 0) {
                    msg += '<br />' + gettext("Failed to share to {placeholder}")
                        .replace('{placeholder}', Common.HTMLescape(data['shared_failed'].join(', ')));
                    Common.feedback(msg, 'info');
                }
            };

            Common.ajaxPost({
                'form': form,
                'post_url': post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'form_id': form_id
            });
            return false;
        }
    });

    return SharePopupView;
});

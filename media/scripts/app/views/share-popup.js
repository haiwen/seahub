define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'select2',
    'jquery.ui.tabs',
    'text!' + app.config._tmplRoot + 'share-popup.html',
], function($, _, Backbone, Common, Select2, Jqueryui, SharePopupTemplate) {
    'use strict';

    var SharePopupView = Backbone.View.extend({

        tagName: 'div',

        template: _.template(SharePopupTemplate),

        initialize: function(options) {
        },

        events: {
            'mouseenter .checkbox-label': function(e) { $(e.currentTarget).addClass('hl'); },
            'mouseleave .checkbox-label': function(e) { $(e.currentTarget).removeClass('hl'); },

            'click .checkbox-orig': 'clickCheckbox',

            'click #delete-download-link-btn': 'deleteDownloadLink',
            'click #delete-upload-link-btn': 'deleteUploadLink',

            'submit #get-download-link-form': 'generateDownloadLink',
            'submit #get-upload-link-form': 'generateUploadLink',

            'click #send-download-link-btn': 'sendDownloadLink',
            'click #send-upload-link-btn': 'sendUploadLink',

            'submit #send-link-form': 'sendLinkSubmit',
            'click #send-link-cancel': 'sendLinkCancel',

            'submit #private-share-form': 'privateShareSubmit',
        },

        privateShareSubmit: function() {
            var form = this.$private_share_form,
                form_id = form.attr('id'),
                post_url,
                post_data = {'repo_id': this.repo_id, 'path': this.dirent_path},
                after_send_link = function(data) {
                    Common.closeModal();
                    Common.feedback(data['success'])
                };

            if (this.is_dir) {
                var post_groups = "",
                    groups = $('[name="groups"]', form).val(),
                    post_emails = "",
                    emails = $('[name="emails"]', form).val();

                if (!emails && !groups) {
                    Common.showFormError(form_id, gettext("Please select at least one people or group."));
                    return false;
                }
                if (groups) {
                    for (var i = 0, len = groups.length; i < len; i++){
                        post_groups += groups[i] + ',';
                    };
                    post_data['groups'] = post_groups;
                    post_data['perm'] = $('[name="permission"]', form).val();
                };
                if (emails) {
                    for (var i = 0, len = emails.length; i < len; i++){
                        post_emails += emails[i] + ',';
                    };
                    post_data['emails'] = post_emails;
                };
                post_url = Common.getUrl({name: 'private_share_dir'});
            } else {
                var post_emails = "",
                    emails = $('[name="emails"]', form).val();
                if (!emails) {
                    Common.showFormError(form_id, gettext("Please select at least one people."));
                    return false;
                }
                for (var i = 0, len = emails.length; i < len; i++){
                    post_emails += emails[i] + ',';
                };
                post_data['emails'] = post_emails;
                post_url = Common.getUrl({name: 'private_share_file'});
            };

//            $('#sending').show();
            Common.ajaxPost({
               'form': form,
               'post_url': post_url,
               'post_data': post_data,
               'after_op_success': after_send_link,
               'form_id': form_id
            });
            return false;
        },

        clickCheckbox: function(e) {
            $(e.currentTarget).parent().toggleClass('checkbox-checked');
            $(e.currentTarget).parents('.checkbox-label').next().toggleClass('hide');
        },

        getGroups: function() {
            var _this = this;
            var after_get_groups = function(data) {

                    var opts = '', group_name,
                        avatar, group_id,
                        groups = data['groups'],
                        format = function(item) {
                            return groups[$(item.element).data('index')].avatar + '<span class="vam">' + item.text + '</span>';
                        };

                    for (var i = 0, len = groups.length; i < len; i++) {
                        group_name = groups[i].name;
                        group_id = groups[i].id;
                        opts += '<option value="' + group_id + '" data-index="' + i + '">' + group_name + '</option>';
                    };

                    $('[name="groups"]', _this.$private_share_form).html(opts).select2({
                        tags: true,
                        tokenSeparators: [',', ' '],
                        placeholder: gettext("Select or Input")
//                        formatResult: format,
//                        formatSelection: format,
//                        escapeMarkup: function(m) { return m; }
                    });
                };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_user_groups'}),
                'after_op_success': after_get_groups
            });
        },

        getContacts: function(cur_form) {
            var _this = this;
            var after_get_contacts = function(data) {
                var opts = '', email, avatar,
                    contacts = data['contacts'],
                    format = function(item) {
                        return contacts[$(item.element).data('index')].avatar + '<span class="vam">' + item.text + '</span>';
                    };

                for (var i = 0, len = contacts.length; i < len; i++) {
                    email = contacts[i].email;
                    opts += '<option value="' + email + '" data-index="' + i + '">' + email + '</option>';
                };

                $('[name="emails"]', _this.$private_share_form).html(opts).select2({
                    tags: true,
                    tokenSeparators: [',', ' '],
                    placeholder: gettext("Select or Input")
//                    formatResult: format,
//                    formatSelection: format,
//                    escapeMarkup: function(m) { return m; }
                });
            };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_user_contacts'}),
                'after_op_success': after_get_contacts
            });
        },

        loadDownloadLink: function() {
            this.$d_link = $('#download-link');
            this.$get_d_link = $('#get-download-link-form');
            this.$send_d_link = $('#send-download-link');
            this.$d_link_text = $('#download-link-text');
            this.$loading_tip = $('.loading-tip');

            var _this = this,
                after_load_d_link = function(data) {
                    _this.$loading_tip.hide();
                    if (data['download_link']) {
                        _this.$d_link.attr('data-token', data['token']);
                        _this.$d_link_text.html(gettext('{placeholder}').replace('{placeholder}', data['download_link']));
                        _this.$send_d_link.show();
                    } else {
                        _this.$get_d_link.show();
                    }
                };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_share_download_link'}),
                'data': {'repo_id': this.repo_id, 'p': this.dirent_path, 'type': this.type},
                'after_op_success': after_load_d_link
            });
        },

        generateDownloadLink: function(e) {
            var _this = this,
                form = this.$get_d_link,
                form_id = form.attr('id'),
                check_password = $('#d-password-switch').attr('checked'),
                check_expire = $('#expire-switch').attr('checked'),
                get_d_link_data = {
                    'repo_id': this.repo_id,
                    'type': this.type,
                    'p': this.dirent_path
                },
                after_generate_d_link = function(data) {
                    form.hide();
                    _this.$send_d_link.show();
                    _this.$d_link_text.html(gettext('{placeholder}').replace('{placeholder}', data['download_link']));
                    _this.$d_link.attr('data-token', data['token']);
                    Common.enableButton(form.find('[type="submit"]'));
                };

            if (check_password) {
                var password = $.trim(form.find('input[name="password"]').val()),
                    password_again = $.trim(form.find('input[name="password-again"]').val());
                if (!password) {
                    Common.showFormError(form_id, gettext("Please input password."));
                    return false;
                } else if (!password_again) {
                    Common.showFormError(form_id, gettext("Please input password again."));
                    return false;
                } else if (password != password_again) {
                    Common.showFormError(form_id, gettext("Passwords don't match."));
                    return false;
                };
                get_d_link_data['use_passwd'] = 1;
                get_d_link_data['passwd'] = password;
            };
            if (check_expire) {
                var expire_days = $.trim(form.find('input[name="expire-days"]').val());
                if (!expire_days) {
                    Common.showFormError(form_id, gettext("Please enter days."));
                    return false;
                } else if (Math.floor(expire_days) != expire_days && !$.isNumeric(expire_days)) {
                    Common.showFormError(form_id, gettext("Please enter valid days."));
                    return false;
                };
                get_d_link_data['expire_days'] = expire_days;
            };
            Common.ajaxPost({
                'form': form,
                'post_url': Common.getUrl({name: 'get_share_download_link'}),
                'post_data': get_d_link_data,
                'after_op_success': after_generate_d_link,
                'form_id': form_id
            });
            return false;
        },

        loadUploadLink: function() {
            this.$u_link = $('#upload-link');
            this.$get_u_link = $('#get-upload-link-form');
            this.$u_link_text = $('#upload-link-text');
            this.$send_u_link = $('#send-upload-link');

            var _this = this,
                after_load_u_link = function(data) {
                    if (data['upload_link']) {
                        _this.$u_link.attr('data-token', data['token']);
                        _this.$u_link_text.html(gettext('{placeholder}').replace('{placeholder}', data['upload_link']));
                        _this.$send_u_link.show();
                    } else {
                        _this.$get_u_link.show();
                    }
                };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_share_upload_link'}),
                'data': {'repo_id': this.repo_id, 'p': this.dirent_path},
                'after_op_success': after_load_u_link
            });
        },

        generateUploadLink: function(e) {
            var _this = this,
                form = this.$get_u_link,
                form_id = form.attr('id'),
                check_password = $('#u-password-switch').attr('checked'),
                get_u_link_data = {
                    'repo_id': this.repo_id,
                    'p': this.dirent_path
                },
                after_generate_u_link = function(data) {
                    if (data['upload_link']) {
                        form.hide();
                        _this.$send_u_link.show();
                        _this.$u_link_text.html(gettext('{placeholder}').replace('{placeholder}', data['upload_link']));
                        _this.$u_link.attr('data-token', data['token']);
                        Common.enableButton(form.find('[type="submit"]'));
                    };
                };

            if (check_password) {
                var password = $.trim(form.find('input[name="password"]').val()),
                    password_again = $.trim(form.find('input[name="password-again"]').val());
                if (!password) {
                    Common.showFormError(form_id, gettext("Please input password."));
                    return false;
                } else if (!password_again) {
                    Common.showFormError(form_id, gettext("Please input password again."));
                    return false;
                } else if (password != password_again) {
                    Common.showFormError(form_id, gettext("Passwords don't match."));
                    return false;
                };
                get_u_link_data['use_passwd'] = 1;
                get_u_link_data['passwd'] = password;
            };
            Common.ajaxPost({
                'form': form,
                'post_url': Common.getUrl({name: 'get_share_upload_link'}),
                'post_data': get_u_link_data,
                'after_op_success': after_generate_u_link,
                'form_id': form_id
            });
            return false;
        },

        deleteDownloadLink: function() {
            var _this = this;
            var after_delete_download_link = function(data) {
                _this.$get_d_link.show();
                _this.$send_d_link.hide();
            };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'delete_share_download_link'}),
                'data': {'t': _this.$d_link.attr('data-token')},
                'after_op_success': after_delete_download_link
            });
        },

        deleteUploadLink: function() {
            var _this = this;
            var after_delete_upload_link = function(data) {
                _this.$get_u_link.show();
                _this.$send_u_link.hide();
            };
            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'delete_share_upload_link'}),
                'data': {'t': _this.$u_link.attr('data-token')},
                'after_op_success': after_delete_upload_link
            });
        },

        sendDownloadLink: function() {
            $('#send-download-link-btn, #delete-download-link-btn').hide();
            this.$send_d_link.append(this.$send_link_form)
            this.$send_link_form.attr('data-shared_link', this.$d_link_text.html());
            this.$send_link_form.show();
        },

        sendUploadLink: function() {
            $('#send-upload-link-btn, #delete-upload-link-btn').hide();
            this.$send_u_link.append(this.$send_link_form)
            this.$send_link_form.attr('data-shared_link', this.$u_link_text.html());
            this.$send_link_form.show();
        },

        sendLinkSubmit: function() {
            var form = this.$send_link_form,
                form_id = this.$send_link_form.attr('id'),
                email = $.trim(form.find('input[name="email"]').val()),
                extra_msg = form.find('textarea[name="extra_msg"]').val();

            if (!email) {
                form.find('.error').html(gettext("Please input at least one email.")).show();
                return false;
            };

            var post_data = {
                'email': email,
                'extra_msg': extra_msg,
                'shared_link': this.$send_link_form.attr('data-shared_link'),
                'shared_name': this.obj_name,
                'shared_type': this.type
                },
                after_op_success = function(data) {
                    Common.closeModal();
                    Common.feedback(gettext('Send success'), 'success', Common.SUCCESS_TIMOUT);
                },
                after_op_error = function(data) {
                    Common.showFormError(form_id, data['error']);
                };

//            $('#sending').show();
            Common.ajaxPost({
               'form': form,
               'post_url': Common.getUrl({name: 'send_share_link'}),
               'post_data': post_data,
               'after_op_success': after_op_success,
               'after_op_error': after_op_error,
               'form_id': form_id
            });
            return false;
        },

        sendLinkCancel: function() {
            this.$send_link_form.hide();
            $('#send-download-link-btn, #delete-download-link-btn').show();
            $('#send-upload-link-btn, #delete-upload-link-btn').show();
        },

        showPopup: function(options) {
            this.is_repo_owner = options.is_repo_owner;
            this.is_virtual = options.is_virtual;
            this.user_perm = options.user_perm;
            this.repo_id = options.repo_id;
            this.dirent_path = options.dirent_path;
            this.obj_name = options.obj_name;
            this.is_dir = options.is_dir;
            this.$el.html(this.template({
                    title: gettext('Sharing {placeholder}').replace('{placeholder}', '<span class="op-target">' + this.obj_name + '</span>'),
                    is_dir: this.is_dir,
                    is_repo_owner: this.is_repo_owner,
                    is_virtual: this.is_virtual,
                    user_perm: this.user_perm,
                    repo_id: this.repo_id,
                    //TODO
                    cloud_mode: false,
                    org: false
                }));

            this.$el.modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$send_link_form = $('#send-link-form');
            this.$private_share_form = $('#private-share-form');
            if (this.is_dir) {
                this.type = 'd';
                this.loadUploadLink();
                $('#dir-share').append(this.$private_share_form);
                this.$private_share_form.show();
                this.getGroups();
            } else {
                $('#file-share').append(this.$private_share_form);
                this.$private_share_form.show();
                this.$private_share_form.find('.dir-share-option').hide();
            };
            this.loadDownloadLink()
            this.getContacts();
            $("#share-tabs").tabs();
        },
    });

    return SharePopupView;
});

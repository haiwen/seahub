define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.ui', /* for tabs */
    'select2',
    'app/views/repo-folder-perm-item'
], function($, _, Backbone, Common, jQueryUI, Select2, RepoFolderPermItemView) {
    'use strict';

    var FolderPermView = Backbone.View.extend({
        tagName: 'div',
        id: 'folder-perm-popup',

        template: _.template($('#folder-perm-popup-tmpl').html()),

        initialize: function(options) {
            this.repo_id = options.repo_id;
            this.obj_name = options.obj_name;
            this.path = options.dir_path;
            this.is_group_owned_repo = options.is_group_owned_repo;
            this.group_id = options.group_id;

            this.render();

            if ($(window).width() < 768) {
                this.$el.css({
                    'width': $(window).width() - 50,
                    'height': $(window).height() - 50,
                    'overflow': 'auto'
                });
            }
            this.$el.modal({
                focus: false
            });
            if ($(window).width() >= 768) {
                $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            }

            this.$("#folder-perm-tabs").tabs();

            this.panelsInit();

            this.$add_user_perm = this.$('#add-user-folder-perm');
            this.$add_group_perm = this.$('#add-group-folder-perm');

            var _this = this;
            $(document).on('click', function(e) {
                var target = e.target || event.srcElement;
                if (!_this.$('.perm-edit-icon, .perm-toggle-select').is(target)) {
                    _this.$('.perm').removeClass('hide');
                    _this.$('.perm-toggle-select').addClass('hide');
                }
            });
        },

        render: function () {
            this.$el.html(this.template({
                title: gettext("Set {placeholder}'s permission")
                    .replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(this.obj_name) + '">' + Common.HTMLescape(this.obj_name) + '</span>')
            }));
            return this;
        },

        panelsInit: function() {
            var _this = this;

            // show existing user folder perm items
            Common.ajaxGet({
                'get_url': Common.getUrl({
                    name: this.is_group_owned_repo ?
                        'group-owned-library-user-folder-permission' :
                        'repo_user_folder_perm',
                    repo_id: this.repo_id
                }),
                'data': {'folder_path': this.path},
                'after_op_success': function(data) {
                    $(data).each(function(index, item) {
                        var perm_item = new RepoFolderPermItemView({
                            item_data: $.extend(item, {
                                'is_group_owned_repo': _this.is_group_owned_repo,
                                'for_user': true
                            })
                        });
                        _this.$add_user_perm.after(perm_item.el);
                    });
                }
            });

            // show existing group folder perm items
            Common.ajaxGet({
                'get_url': Common.getUrl({
                    name: this.is_group_owned_repo ?
                        'group-owned-library-group-folder-permission' :
                        'repo_group_folder_perm',
                    repo_id: this.repo_id
                }),
                'data': {'folder_path': this.path},
                'after_op_success': function (data) {
                    $(data).each(function(index, item) {
                        var perm_item = new RepoFolderPermItemView({
                            item_data: $.extend(item, {
                                'is_group_owned_repo': _this.is_group_owned_repo,
                                'for_user': false
                            })
                        });
                        _this.$add_group_perm.after(perm_item.el);
                    });
                }
            });

            // use select2 to 'user' input in 'add user perm'
            var url;
            $('[name="email"]', this.$add_user_perm).select2(
                    Common.contactInputOptionsForSelect2());

            // use select2 to 'group' input in 'add group perm'
            var groups;
            var prepareGroupSelector = function(groups) {
                var g_opts = '';
                for (var i = 0, len = groups.length; i < len; i++) {
                    g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
                }
                $('[name="group"]', _this.$add_group_perm).html(g_opts).select2({
                    placeholder: gettext("Select groups"),
                    escapeMarkup: function(m) { return m; }
                });
            };

            $.ajax({
                url: Common.getUrl({
                    name: 'shareable_groups'
                }),
                cache: false,
                dataType: 'json',
                success: function(data) {
                    groups = data;
                },
                error: function(xhr) {
                    groups = [];
                },
                complete: function() {
                    prepareGroupSelector(groups);
                }
            });
        },

        events: {
            'click #add-user-folder-perm .submit': 'addFolderPerm',
            'click #add-group-folder-perm .submit': 'addFolderPerm'
        },

        addFolderPerm: function(e) {
            var $form, $error, url, post_data, extended_data;

            if ($(e.currentTarget).closest('tr').attr('id') == 'add-user-folder-perm') {
                $form = this.$add_user_perm;
                $error = $('#user-folder-perm .error');

                url = Common.getUrl({
                    name: this.is_group_owned_repo ?
                        'group-owned-library-user-folder-permission' :
                        'repo_user_folder_perm',
                    repo_id: this.repo_id
                });
                var emails_group_ids_input = $('[name="email"]', $form),
                    emails = emails_group_ids_input.val(),
                    perm = $('[name="permission"]', $form).val();

                if (!emails || !perm) {
                    return false;
                }

                post_data = {
                    'folder_path': this.path,
                    'user_email': emails.split(','),
                    'permission': perm
                };

                extended_data = {
                    'is_group_owned_repo': this.is_group_owned_repo,
                    'for_user': true
                };

            } else {
                $form = this.$add_group_perm;
                $error = $('#group-folder-perm .error');

                url = Common.getUrl({
                    name: this.is_group_owned_repo ?
                        'group-owned-library-group-folder-permission' :
                        'repo_group_folder_perm',
                    repo_id: this.repo_id
                });

                var emails_group_ids_input = $('[name="group"]', $form),
                    group_ids = emails_group_ids_input.val().join(','),
                    perm = $('[name="permission"]', $form).val();

                if (!group_ids || !perm) {
                    return false;
                }

                post_data = {
                    'folder_path': this.path,
                    'group_id': group_ids.split(','),
                    'permission': perm
                };

                extended_data = {
                    'is_group_owned_repo': this.is_group_owned_repo,
                    'for_user': false
                };
            }

            var $submit_btn = $form.children('[type="submit"]');

            Common.disableButton($submit_btn);

            $.ajax({
                url: url,
                dataType: 'json',
                method: 'POST',
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: post_data,
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var perm_item = new RepoFolderPermItemView({
                                item_data: $.extend(item, extended_data)
                            });
                            $form.closest('tr').after(perm_item.el);
                        });

                        emails_group_ids_input.select2("val", "");
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var error_msg = '';
                        $(data.failed).each(function(index, item) {
                            error_msg += Common.HTMLescape(item.user_email || item.group_id) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                        });
                        $error.html(error_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    $error.html(error_msg).show();
                }
            });
        }
    });

    return FolderPermView;
});

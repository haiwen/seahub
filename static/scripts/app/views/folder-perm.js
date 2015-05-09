define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.ui.tabs',
    'select2',
    'app/views/folder-perm-item'
], function($, _, Backbone, Common, Tabs, Select2, FolderPermItemView) {
    'use strict';

    var FolderPermView = Backbone.View.extend({
        tagName: 'div',
        id: 'folder-perm-popup',

        template: _.template($('#folder-perm-popup-tmpl').html()),

        initialize: function(options) {
            this.repo_id = options.repo_id;
            this.obj_name = options.obj_name;
            this.dir_path = options.dir_path;
            this.path = Common.pathJoin([this.dir_path, this.obj_name])

            this.render();

            this.$el.modal({
                appendTo: "#main",
                focus: false,
                containerCss: {"padding": 0}
            });
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$("#folder-perm-tabs").tabs();

            this.panelsInit();

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
            this.$add_user_perm = this.$('#add-user-folder-perm');
            this.$add_group_perm = this.$('#add-group-folder-perm');

            var _this = this;
            var $add_user_perm = this.$add_user_perm,
                $add_group_perm = this.$add_group_perm;

            // show existing perm items
            Common.ajaxGet({
                'get_url': Common.getUrl({
                    name: 'get_folder_perm_by_path',
                    repo_id: this.repo_id
                }),
                'data': {'path': this.path},
                'after_op_success': function (data) {
                    $(data['user_perms']).each(function(index, item) {
                        var perm_item = new FolderPermItemView({
                            'repo_id': _this.repo_id,
                            'path': _this.path,
                            'item_data':$.extend(item, {'is_user_perm': true})
                        });
                        $add_user_perm.after(perm_item.el);
                    });

                    $(data['group_perms']).each(function(index, item) {
                        var perm_item = new FolderPermItemView({
                            'repo_id': _this.repo_id,
                            'path': _this.path,
                            'item_data':$.extend(item, {'is_user_perm': false})
                        });
                        $add_group_perm.after(perm_item.el);
                    });
                }
            });

            // use select2 to 'user' input in 'add user perm'
            $('[name="email"]', $add_user_perm).select2(Common.contactInputOptionsForSelect2());

            // use select2 to 'group' input in 'add group perm'
            var groups = app.pageOptions.groups || [],
                g_opts = '';
            for (var i = 0, len = groups.length; i < len; i++) {
                g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
            }
            $('[name="group"]', $add_group_perm).html(g_opts).select2({
                placeholder: gettext("Select groups"),
                escapeMarkup: function(m) { return m; }
            });
        },

        events: {
            'click #add-user-folder-perm .submit': 'addUserFolderPerm',
            'click #add-group-folder-perm .submit': 'addGroupFolderPerm'
        },

        addUserFolderPerm: function() {
            var _this = this;
            var form = this.$add_user_perm, // pseudo form
                email = $('[name="email"]', form).val();
            if (!email) {
                return false;
            }

            var perm = $('[name="permission"]', form).val();
            Common.ajaxPost({
                'form': form,
                'form_id': form.attr('id'),
                'post_url': Common.getUrl({
                    name: 'set_user_folder_perm',
                    repo_id: this.repo_id
                }),
                'post_data': {
                    'path': this.path,
                    'type': 'add',
                    'user': email,
                    'perm': perm
                },
                'after_op_success': function(data) {
                    $(data.success).each(function(index, item) {
                        var perm_item = new FolderPermItemView({
                            'repo_id': _this.repo_id,
                            'path': _this.path,
                            'item_data': {
                                'user': email,
                                'user_name': item.user_name,
                                'perm': perm,
                                'is_user_perm': true
                            }
                        });
                        form.after(perm_item.el);
                    });

                    $('[name="email"]', form).select2("val", "");
                    $('#user-folder-perm .error').addClass('hide');
                },
                'after_op_error': function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    $('#user-folder-perm .error').html(err).removeClass('hide');
                }
            });
        },

        addGroupFolderPerm: function() {
            var _this = this;
            var form = this.$add_group_perm, // pseudo form
                group_ids = $('[name="group"]', form).val().join(',');
            if (!group_ids) {
                return false;
            }

            var perm = $('[name="permission"]', form).val();
            Common.ajaxPost({
                'form': form,
                'form_id': form.attr('id'),
                'post_url': Common.getUrl({
                    name: 'set_group_folder_perm',
                    repo_id: this.repo_id
                }),
                'post_data': {
                    'path': this.path,
                    'type': 'add',
                    'group_id': group_ids,
                    'perm': perm
                },
                'after_op_success': function(data) {
                    $(data.success).each(function(index, item) {
                        var perm_item = new FolderPermItemView({
                            'repo_id': _this.repo_id,
                            'path': _this.path,
                            'item_data': {
                                'is_user_perm': false,
                                'perm': perm,
                                'group_id': item.group_id,
                                'group_name': item.group_name
                            }
                        });
                        form.after(perm_item.el);
                        $('#group-folder-perm .error').addClass('hide');
                    });

                    $('[name="group"]', form).select2("val", "");
                },
                'after_op_error': function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    $('#group-folder-perm .error').html(err).removeClass('hide');
                }
            });
        }
    });

    return FolderPermView;
});

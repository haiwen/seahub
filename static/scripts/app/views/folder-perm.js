define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.ui.tabs',
    'select2'
], function($, _, Backbone, Common, Tabs, Select2) {
    'use strict';

    var FolderPermView = Backbone.View.extend({
        tagName: 'div',
        id: 'folder-perm-popup',
        template: _.template($('#set-folder-perm-tmpl').html()),
        itemTemplate: _.template($('#folder-perm-item-tmpl').html()),

        initialize: function(options) {
            this.repo_id = options.repo_id;
            this.obj_name = options.obj_name;
            this.dir_path = options.dir_path;
            this.showPopup();
            $(document).on('click', function(e) {
                var target = e.target || event.srcElement;
                if (!$('.perm-edit-icon, .perm-toggle-select').is(target)) {
                    $('.perm-change').removeClass('hide');
                    $('.perm-toggle-select').addClass('hide');
                }
            });
        },

        events: {
            'mouseenter .folder-perm-item': 'showPermEditIcon',
            'mouseleave .folder-perm-item': 'hidePermEditIcon',
            'click .submit': 'addFolderPerm',
            'click .perm-edit-icon': 'editIconClick',
            'click .perm-delete-btn': 'deleteFolderPerm',
            'change .perm-toggle-select': 'modifyFolderPerm'
        },

        editIconClick: function (e) {
            $(e.currentTarget).parent().addClass('hide')
                              .next().removeClass('hide');
        },

        showPermEditIcon: function (e) {
            var target = $(e.currentTarget);
            target.find('.perm-edit-icon').removeClass('vh');
            target.find('.perm-delete-btn').removeClass('vh');
        },

        hidePermEditIcon: function (e) {
            var target = $(e.currentTarget);
            target.find('.perm-edit-icon').addClass('vh');
            target.find('.perm-delete-btn').addClass('vh');
        },

        showPopup: function () {
            var $el = this.$el;
            $el.html(this.template({
                title: gettext("Set {placeholder}'s permission").replace('{placeholder}', '<span class="op-target">' + Common.HTMLescape(this.obj_name) + '</span>')
            }));
            this.$("#set-folder-perm-tabs").tabs();
            $el.modal({ appendTo: "#main", focus: false, containerCss: {"padding": 0} });
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            this.folderPermInit();
        },

        folderPermInit: function() {
            var user_form = this.$('#user-folder-perm-form'),
                group_form = this.$('#group-folder-perm-form'),

                contacts = app.pageOptions.contacts || [],
                groups = app.pageOptions.groups || [],
                g_opts = '',

                _this = this,
                data = { 'path': this.dir_path + this.obj_name },
                success_callback = function(data) {
                    if (data['success']) {
                         user_form.after(_this.itemTemplate({perms: data['user_perms'], is_user: true}));
                         group_form.after(_this.itemTemplate({perms: data['group_perms'], is_user: false}));
                    }
                };

            $('[name="email"]', user_form).select2({
                maximumSelectionSize: 1,
                tags: function () {
                    var contact_list = [];
                    for (var i = 0, len = contacts.length; i < len; i++) {
                        contact_list.push(contacts[i].email);
                    }
                    return contact_list;
                },
                tokenSeparators: [',', ' '],
                escapeMarkup: function(m) { return m; }
            }).on("select2-focus", function(e) {
                _this.$('.select2-choices', user_form).css({'border-color': '', 'background-color': ''});
            });

            for (var i = 0, len = groups.length; i < len; i++) {
                g_opts += '<option value="' + groups[i].id + '" data-index="' + i + '">' + groups[i].name + '</option>';
            }
            $('[name="group"]', group_form).html(g_opts).select2({
                maximumSelectionSize: 1,
                escapeMarkup: function(m) { return m; }
            }).on("select2-focus", function(e) {
                _this.$('.select2-choices', group_form).css({'border-color': '', 'background-color': ''});
            });

            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'get_folder_perm_by_path', repo_id: this.repo_id}),
                'data': data,
                'after_op_success': success_callback
            });
        },

        isOnUserTab: function(e) {
            if ($(e.currentTarget).closest('#user-folder-perm').length === 1) {
                return true;
            } else {
                return false;
            }
        },

        addFolderPerm: function (e) {
            var is_user = this.isOnUserTab(e),
                form, form_id, email, group_id,
                post_url, after_op_success,
                post_data = {'path': this.dir_path + this.obj_name, 'type': 'add'},
                _this = this,
                after_op_error = function(xhr, textStatus, errorThrown) {
                    if (xhr.responseText) {
                        Common.feedback($.parseJSON(xhr.responseText).error, 'error');
                    } else {
                        Common.feedback(gettext("Failed. Please check the network."), 'error');
                    }
                };

            if (is_user) {
                form = this.$('#user-folder-perm-form');
                form_id = form.attr('id');
                email = $('[name="email"]', form).val();
                if (!email) {
                    this.$('.select2-choices', form).css({'border-color': '#dbb1b1', 'background-color': '#fff0f0'});
                    return false;
                } else {
                    post_data['user'] = email;
                }
                post_url = Common.getUrl({name: 'set_user_folder_perm', repo_id: this.repo_id});
                after_op_success = function(data) {
                    if (data['success']) {
                        form.after(_this.itemTemplate({perms: [post_data], is_user: true}));
                        $('[name="email"]', form).select2("val", "");
                        _this.$('.select2-choices', form).css({'border-color': '', 'background-color': ''});
                    }
                };
            } else {
                form = this.$('#group-folder-perm-form');
                form_id = form.attr('id');
                group_id = $('[name="group"]', form).val();
                if (!group_id) {
                    this.$('.select2-choices', form).css({'border-color': '#dbb1b1', 'background-color': '#fff0f0'});
                    return false;
                } else {
                    post_data['group_id'] = parseInt(group_id);
                }
                post_url = Common.getUrl({name: 'set_group_folder_perm', repo_id: this.repo_id});
                after_op_success = function(data) {
                    if (data['success']) {
                        post_data['group_name'] = Common.HTMLescape($('[name="group"]', form).select2('data')[0].text);
                        form.after(_this.itemTemplate({perms: [post_data], is_user: false}));
                        $('[name="group"]', form).select2("val", "");
                        _this.$('.select2-choices', form).css({'border-color': '', 'background-color': ''});
                    }
                };
            }

            post_data['perm'] = $('[name="permission"]', form).val();

            Common.ajaxPost({
                'form': form,
                'post_url': post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'after_op_error': after_op_error,
                'form_id': form_id
            });
            return false;
        },

        modifyFolderPerm: function (e) {
            var is_user = this.isOnUserTab(e),
                $select = $(e.currentTarget),
                selected_val = $select.val(),
                url,
                data = {
                    'perm': selected_val,
                    'path': this.dir_path + this.obj_name,
                    'type': 'modify'
                },
                $tr = $select.closest('tr');

            if (is_user) {
                data['user'] = $tr.data('user');
                url = Common.getUrl({name: 'set_user_folder_perm', repo_id: this.repo_id});
            } else {
                data['group_id'] = $tr.data('group_id');
                url = Common.getUrl({name: 'set_group_folder_perm', repo_id: this.repo_id});
            }

            $.ajax({
                url: url,
                type: 'POST',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function(data) {
                    $select.addClass('hide')
                           .prev().removeClass('hide')
                                  .children('span')
                                  .html($select.children('option[value="' + selected_val + '"]').text());
                    $tr.attr('data-perm', selected_val);
                },
                error: function(xhr, textStatus, errorThrown) {
                    if (xhr.responseText) {
                        Common.feedback($.parseJSON(xhr.responseText).error, 'error');
                    } else {
                        Common.feedback(gettext("Failed. Please check the network."), 'error');
                    }
                }
            });
            return false;
        },

        deleteFolderPerm: function (e) {
            var is_user = this.isOnUserTab(e),
                $tr = $(e.currentTarget).closest('tr'),
                url,
                data = {
                    'perm': $tr.data('perm'),
                    'path': this.dir_path + this.obj_name,
                    'type': 'delete'
                },
                after_op_success = function(data) {
                    if (data['success']) {
                        $tr.remove();
                    }
                };

            if (is_user) {
                data['user'] = $tr.data('user');
                url = Common.getUrl({name: 'set_user_folder_perm', repo_id: this.repo_id});
            } else {
                data['group_id'] = $tr.data('group_id');
                url = Common.getUrl({name: 'set_group_folder_perm', repo_id: this.repo_id});
            }

            $.ajax({
                url: url,
                type: 'POST',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: after_op_success,
                error: function(xhr, textStatus, errorThrown) {
                    if (xhr.responseText) {
                        Common.feedback($.parseJSON(xhr.responseText).error, 'error');
                    } else {
                        Common.feedback(gettext("Failed. Please check the network."), 'error');
                    }
                }
            });
            return false;
        }
    });

    return FolderPermView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var FolderShareItemView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#folder-perm-item-tmpl').html()),

        initialize: function(options) {
            if (options.item_data.show_folder_path === undefined) {
                $.extend(options.item_data, {'show_folder_path': false})
            }

            this.item_data = options.item_data;
            this.repo_id = options.repo_id;
            this.path = options.path;

            // show info about 'is_admin'
            this.show_admin = false;
            if (app.pageOptions.is_pro &&
                this.path == '/' &&
                !this.item_data.is_group_owned_repo) { // not for group owned repo
                this.show_admin = true;
            }

            this.render();
        },

        render: function () {
            this.$el.html(this.template($.extend({}, this.item_data, {'show_admin': this.show_admin})));
            return this;
        },

        events: {
            'mouseenter': 'showOpIcons',
            'mouseleave': 'hideOpIcons',
            'click .perm-edit-icon': 'editIconClick',
            'change .perm-toggle-select': 'editPerm',
            'click .delete-icon': 'del'
        },

        showOpIcons: function () {
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideOpIcons: function () {
            this.$el.find('.op-icon').addClass('vh');
        },

        editIconClick: function (e) {
            $(e.currentTarget).closest('td')
                .find('.perm').addClass('hide').end()
                .find('.perm-toggle-select').removeClass('hide');

            return false;
        },

        editPerm: function (e) {
            var _this = this;
            var perm = $(e.currentTarget).val();
            var item_data = this.item_data;
            var url, method, data;
            if (item_data.is_group_owned_repo) { // group owned repo
                if (item_data.for_user) {
                    url = Common.getUrl({
                        name: 'group_owned_repo_user_share',
                        repo_id: this.repo_id
                    });
                    data = {
                        'username': item_data.user_email,
                        'permission': perm,
                        'path': this.path
                    };
                } else {
                    url = Common.getUrl({
                        name: 'group_owned_repo_group_share',
                        repo_id: this.repo_id
                    });
                    data = {
                        'group_id': item_data.group_id,
                        'permission': perm,
                        'path': this.path
                    };
                }
                method = 'PUT';
            } else {
                url = Common.getUrl({
                        name: 'dir_shared_items',
                        repo_id: this.repo_id
                    }) + '?p=' + encodeURIComponent(this.path);
                if (item_data.for_user) {
                    url += '&share_type=user&username=' + encodeURIComponent(item_data.user_email);
                } else {
                    url += '&share_type=group&group_id=' + encodeURIComponent(item_data.group_id);
                }
                data = {
                    'permission': perm
                };
                method = 'POST';
            }
            $.ajax({
                url: url,
                dataType: 'json',
                method: method,
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function () {
                    if (perm == 'admin') {
                        item_data.is_admin = true;
                        item_data.permission = 'rw';
                    } else {
                        item_data.permission = perm;
                        item_data.is_admin = false;
                    }
                    _this.render();
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = gettext("Edit failed");
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    if (item_data.for_user) {
                        $('#dir-user-share .error').html(err_msg).removeClass('hide');
                    } else {
                        $('#dir-group-share .error').html(err_msg).removeClass('hide');
                    }
                }
            });
        },

        del: function () {
            var _this = this;
            var item_data = this.item_data;
            var url, data = {};

            if (item_data.is_group_owned_repo) { // group owned repo
                if (item_data.for_user) {
                    url = Common.getUrl({
                        name: 'group_owned_repo_user_share',
                        repo_id: this.repo_id
                    });
                    data = {
                        'username': item_data.user_email,
                        'path': this.path
                    };
                } else {
                    url = Common.getUrl({
                        name: 'group_owned_repo_group_share',
                        repo_id: this.repo_id
                    });
                    data = {
                        'group_id': item_data.group_id,
                        'path': this.path
                    };
                }
            } else {
                url = Common.getUrl({
                        name: 'dir_shared_items',
                        repo_id: this.repo_id
                    }) + '?p=' + encodeURIComponent(this.path);
                if (item_data.for_user) {
                    url += '&share_type=user&username=' + encodeURIComponent(item_data.user_email);
                } else {
                    url += '&share_type=group&group_id=' + encodeURIComponent(item_data.group_id);
                }
            }
            $.ajax({
                url: url,
                dataType: 'json',
                method: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function () {
                    _this.remove();
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = gettext("Delete failed");
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    if (item_data.for_user) {
                        $('#dir-user-share .error').html(err_msg).removeClass('hide');
                    } else {
                        $('#dir-group-share .error').html(err_msg).removeClass('hide');
                    }
                }
            });

            return false;
        }

    });

    return FolderShareItemView;
});

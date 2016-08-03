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
            this.item_data = options.item_data;
            this.repo_id = options.repo_id;
            this.render();
        },

        render: function () {
            this.$el.html(this.template(this.item_data));
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
            var item_data = this.item_data;
            var perm = $(e.currentTarget).val();
            var url, data;

            if (item_data.for_user) {
                url = Common.getUrl({name: 'admin_library_user_share', repo_id: this.repo_id});
                data = {'permission': perm, 'user_email': item_data.user_email};
            } else {
                url = Common.getUrl({name: 'admin_library_group_share', repo_id: this.repo_id});
                data = {'permission': perm, 'group_id': item_data.group_id};
            }

            $.ajax({
                url: url,
                dataType: 'json',
                method: 'PUT',
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function (data) {
                    item_data.permission = data.permission;
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
                        $('#dir-group-group .error').html(err_msg).removeClass('hide');
                    }
                }
            });
        },

        del: function () {
            var _this = this;
            var item_data = this.item_data;
            var url, data;

            if (item_data.for_user) {
                url = Common.getUrl({name: 'admin_library_user_share', repo_id: this.repo_id});
                data = {'permission': item_data.permission, 'user_email': item_data.user_email};
            } else {
                url = Common.getUrl({name: 'admin_library_group_share', repo_id: this.repo_id});
                data = {'permission': item_data.permission, 'group_id': item_data.group_id};
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
                error: function (xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = gettext("Delete failed");
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    if (item_data.for_user) {
                        $('#dir-user-share .error').html(err_msg).removeClass('hide');
                    } else {
                        $('#dir-group-group .error').html(err_msg).removeClass('hide');
                    }
                }
            });

            return false;
        }

    });

    return FolderShareItemView;
});

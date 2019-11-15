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
            this.$el.html(this.template($.extend({}, this.item_data, {is_pro: app.pageOptions.is_pro})));
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
            var url = Common.getUrl({name: 'admin_shares'});
            var data;

            if (item_data.for_user) {
                data = {
                    'repo_id': _this.repo_id,
                    'share_type': 'user',
                    'permission': perm,
                    'share_to': item_data.user_email
                };
            } else {
                data = {
                    'repo_id': _this.repo_id,
                    'share_type': 'group',
                    'permission': perm,
                    'share_to': item_data.group_id
                };
            }

            $.ajax({
                url: url,
                dataType: 'json',
                method: 'PUT',
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function (data) {
                    item_data.permission = data.permission;
                    item_data.is_admin = data.is_admin;
                    _this.render();
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    if (item_data.for_user) {
                        $('#dir-user-share .error').html(error_msg).removeClass('hide');
                    } else {
                        $('#dir-group-share .error').html(error_msg).removeClass('hide');
                    }
                }
            });
        },

        del: function () {
            var _this = this;
            var item_data = this.item_data;
            var url = Common.getUrl({name: 'admin_shares'});
            var data;

            if (item_data.for_user) {
                data = {
                    'repo_id': _this.repo_id,
                    'share_type': 'user',
                    'permission': item_data.permission,
                    'share_to': item_data.user_email
                };
            } else {
                data = {
                    'repo_id': _this.repo_id,
                    'share_type': 'group',
                    'permission': item_data.permission,
                    'share_to': item_data.group_id
                };
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
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    if (item_data.for_user) {
                        $('#dir-user-share .error').html(error_msg).removeClass('hide');
                    } else {
                        $('#dir-group-share .error').html(error_msg).removeClass('hide');
                    }
                }
            });

            return false;
        }

    });

    return FolderShareItemView;
});

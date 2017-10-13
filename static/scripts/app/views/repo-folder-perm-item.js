define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var FolderPermItemView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#folder-perm-item-tmpl').html()),

        initialize: function(options) {
            if (options.item_data.show_folder_path === undefined) {
                $.extend(options.item_data, {'show_folder_path': false})
            }

            this.data = {show_admin: false}; // `show_admin: false`: because the tmpl is also used by 'views/folder-share-item.js'
            $.extend(this.data, options.item_data);

            this.render();
        },

        render: function () {
            this.$el.html(this.template(this.data));
            return this;
        },

        events: {
            'mouseenter': 'showPermOpIcons',
            'mouseleave': 'hidePermOpIcons',
            'click .perm-edit-icon': 'editIconClick',
            'change .perm-toggle-select': 'editPerm',
            'click .delete-icon': 'deletePerm'
        },

        showPermOpIcons: function () {
            this.$el.find('.op-icon').removeClass('vh');
        },

        hidePermOpIcons: function () {
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
            var data = {
                'permission': perm,
                'folder_path': this.data.folder_path
            };
            var for_user = this.data.for_user;
            if (for_user) {
                $.extend(data, {'user_email': this.data.user_email});
            } else {
                $.extend(data, {'group_id': this.data.group_id});
            }
            $.ajax({
                url: Common.getUrl({
                    name: for_user ? 'repo_user_folder_perm' : 'repo_group_folder_perm',
                    repo_id: this.data.repo_id
                }),
                type: 'PUT',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function() {
                    _this.data.permission = perm;
                    _this.render();
                },
                error: function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    if (for_user) {
                        $('#user-folder-perm .error').html(err).removeClass('hide');
                    } else {
                        $('#group-folder-perm .error').html(err).removeClass('hide');
                    }
                }
            });
        },

        deletePerm: function () {
            var _this = this;
            var data = {
                'permission': this.data.permission,
                'folder_path': this.data.folder_path
            };
            var for_user = this.data.for_user;
            if (for_user) {
                $.extend(data, {'user_email': this.data.user_email});
            } else {
                $.extend(data, {'group_id': this.data.group_id});
            }
            $.ajax({
                url: Common.getUrl({
                    name: for_user ? 'repo_user_folder_perm' : 'repo_group_folder_perm',
                    repo_id: this.data.repo_id
                }),
                type: 'DELETE',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function() {
                    _this.remove();
                },
                error: function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    if (for_user) {
                        $('#user-folder-perm .error').html(err).removeClass('hide');
                    } else {
                        $('#group-folder-perm .error').html(err).removeClass('hide');
                    }
                }
            });

            return false;
        }

    });

    return FolderPermItemView;
});

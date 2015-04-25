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
            this.item_data = options.item_data;
            this.repo_id = options.repo_id;
            this.path = options.path;

            this.render();
        },

        render: function () {
            this.$el.html(this.template(this.item_data));
            return this;
        },

        events: {
            'mouseenter': 'showPermOpIcons',
            'mouseleave': 'hidePermOpIcons',
            'click .perm-edit-icon': 'editIconClick',
            'change .perm-toggle-select': 'editPerm',
            'click .perm-delete-icon': 'deletePerm'
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
        },

        editPerm: function (e) {
            var _this = this;
            var perm = $(e.currentTarget).val();
            var post_data = {
                'perm': perm,
                'path': this.path,
                'type': 'modify'
            };
            var is_user_perm = this.item_data.is_user_perm;
            if (is_user_perm) {
                $.extend(post_data, {'user': this.item_data.user});
            } else {
                $.extend(post_data, {'group_id': this.item_data.group_id});
            }
            $.ajax({
                url: Common.getUrl({
                    name: is_user_perm ? 'set_user_folder_perm' : 'set_group_folder_perm',
                    repo_id: this.repo_id
                }),
                type: 'POST',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: post_data,
                success: function() {
                    _this.item_data.perm = perm;
                    _this.render();
                },
                error: function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    if (is_user_perm) {
                        $('#user-folder-perm .error').html(err).removeClass('hide');
                    } else {
                        $('#group-folder-perm .error').html(err).removeClass('hide');
                    }
                }
            });
        },

        deletePerm: function () {
            var _this = this;
            var post_data = {
                'perm': this.item_data.perm,
                'path': this.path,
                'type': 'delete'
            };
            var is_user_perm = this.item_data.is_user_perm;
            if (is_user_perm) {
                $.extend(post_data, {'user': this.item_data.user});
            } else {
                $.extend(post_data, {'group_id': this.item_data.group_id});
            }
            $.ajax({
                url: Common.getUrl({
                    name: is_user_perm ? 'set_user_folder_perm' : 'set_group_folder_perm',
                    repo_id: this.repo_id
                }),
                type: 'POST',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: post_data,
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
                    if (is_user_perm) {
                        $('#user-folder-perm .error').html(err).removeClass('hide');
                    } else {
                        $('#group-folder-perm .error').html(err).removeClass('hide');
                    }
                }
            });
        }

    });

    return FolderPermItemView;
});

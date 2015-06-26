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
            this.path = options.path;

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
        },

        editPerm: function (e) {
            var _this = this;
            var item_data = this.item_data;
            var for_user = item_data.for_user;
            var share_type = for_user ? 'personal' : 'group';
            var perm = $(e.currentTarget).val();
            var post_data = {
                repo_id: this.repo_id,
                email_or_group: for_user ? item_data.user : item_data.group_id,
                permission: perm 
            };

            $.ajax({
                url: Common.getUrl({
                    name: 'share_permission_admin' 
                }) + '?share_type=' + share_type,
                type: 'POST',
                dataType: 'json',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: post_data,
                success: function() {
                    item_data.perm = perm;
                    _this.render();
                },
                error: function(xhr) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    if (share_type == 'personal') {
                        $('#dir-user-share .error').html(err).removeClass('hide');
                    } else {
                        $('#dir-group-group .error').html(err).removeClass('hide');
                    }
                }
            });
        },

        del: function () {
        }

    });

    return FolderShareItemView;
});

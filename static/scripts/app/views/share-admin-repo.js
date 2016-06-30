define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {
    'use strict';

    var ShareAdminRepoView = HLItemView.extend({

        tagName: 'tr',

        template: _.template($('#share-admin-folder-tmpl').html()),

        events: {
            'click .perm-edit-icon': 'showPermSelect',
            'change .perm-select': 'updatePermission',
            'click .unshare': 'removeShare'
        },

        initialize: function(option) {
            HLItemView.prototype.initialize.call(this);
            this.listenTo(this.model, "change", this.render);
        },

        showPermSelect: function() {
            this.$el.closest('table')
                .find('.perm-select').hide().end()
                .find('.cur-perm, .perm-edit-icon').show();

            this.$('.cur-perm, .perm-edit-icon').hide();
            this.$('.perm-select').show();

            return false;
        },

        updatePermission: function() {
            var _this = this;
            var url = Common.getUrl({
                    'name': 'share_admin_repo',
                    'repo_id': this.model.get('repo_id')
                });
            var share_type = this.model.get('share_type');
            var perm = this.$('.perm-select').val();
            var data = {
                'share_type': share_type,
                'permission': perm
            };
            if (share_type == 'personal') {
                data['user'] = this.model.get('user_email');
            } else if (share_type == 'group') {
                data['group_id'] = this.model.get('group_id');
            }

            $.ajax({
                url: url,
                method: 'PUT',
                cache: false,
                dataType: 'json',
                data: data,
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.model.set({'share_permission': perm});
                    Common.feedback(gettext("Successfully modified permission"), 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        },

        removeShare: function() {
            var _this = this;
            var share_type = this.model.get('share_type');
            var url = Common.getUrl({
                    'name': 'share_admin_repo',
                    'repo_id': this.model.get('repo_id')
                });

            if (share_type == 'personal') {
                url += '?share_type=personal&user=' + encodeURIComponent(this.model.get('user_email'));
            } else if (share_type == 'group') {
                url += '?share_type=group&group_id=' + this.model.get('group_id');
            } else if (share_type == 'public') {
                url += '?share_type=public';
            }

            $.ajax({
                url: url,
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully deleted 1 item"), 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        },

        render: function() {
            var obj = this.model.toJSON(),
                icon_size = Common.isHiDPI() ? 96 : 24,
                icon_url = this.model.getIconUrl(icon_size);

            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle(),
                'url': this.model.getWebUrl(),
                'name': this.model.get('repo_name')
            });

            this.$el.html(this.template(obj));
            return this;
        }

    });

    return ShareAdminRepoView;
});

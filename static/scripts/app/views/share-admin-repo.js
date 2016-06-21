define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, HLItemView, DropdownView) {
    'use strict';

    var ShareAdminRepoView = HLItemView.extend({

        tagName: 'tr',

        template: _.template($('#share-admin-repo-tmpl').html()),

        events: {
            'click .unshare': 'removeShare',
            'change .share-permission-select': 'updatePermission'
        },

        initialize: function(option) {
            this.listenTo(this.model, "change", this.render);
            HLItemView.prototype.initialize.call(this);
        },

        updatePermission: function() {
            var _this = this;
            var share_type = this.model.get('share_type');
            var perm = this.$('.share-permission-select').val();

            var data = {'share_type': share_type, 'permission': perm};
            var url = Common.getUrl({
                    'name': 'share_admin_repo',
                    'repo_id': this.model.get('repo_id')
                });

            if (share_type == 'personal') {
                data['user'] = this.model.get('user_email');
            } else if (share_type == 'group') {
                data['group_id'] = this.model.get('group_id');
            }

            $.ajax({
                url: url,
                dataType: 'json',
                method: 'PUT',
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function () {
                    _this.model.set({'share_permission': perm});
                    _this.render();
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function (xhr) {
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
                url += '?share_type=personal&user=' + Common.encodePath(this.model.get('user_email'));
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
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function (xhr) {
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
                'repo_url': this.model.getWebUrl()
            });

            this.$el.html(this.template(obj));

            new DropdownView({
                el: this.$('.sf-dropdown'),
                left: '-70px'
            });

            return this;
        }

    });

    return ShareAdminRepoView;
});

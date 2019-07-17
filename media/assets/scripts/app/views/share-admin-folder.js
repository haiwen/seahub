define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {
    'use strict';

    var ShareAdminFolderView = HLItemView.extend({

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
            var share_type = this.model.get('share_type');
            var perm = this.$('.perm-select').val();
            var url = Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: this.model.get('repo_id')
                }) + '?p=' + encodeURIComponent(this.model.get('path'));

            if (share_type == 'personal') {
                url += '&share_type=user&username=' + encodeURIComponent(this.model.get('user_email'));
            } else if (share_type == 'group') {
                url += '&share_type=group&group_id=' + this.model.get('group_id');
            }

            $.ajax({
                url: url,
                method: 'POST',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'permission': perm
                },
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
                    name: 'dir_shared_items',
                    repo_id: this.model.get('repo_id')
                }) + '?p=' + Common.encodePath(this.model.get('path'));

            if (share_type == 'personal') {
                url += '&share_type=user&username=' + Common.encodePath(this.model.get('user_email'));
            } else if (share_type == 'group') {
                url += '&share_type=group&group_id=' + this.model.get('group_id');
            }

            $.ajax({
                url: url,
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully deleted 1 item"), 'success');
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
                icon_url = this.model.getIconUrl(icon_size),
                cur_perm_text;

            switch(obj.share_permission) {
                case 'rw':
                    cur_perm_text = gettext("Read-Write");
                    break;
                case 'r':
                    cur_perm_text = gettext("Read-Only");
                    break;
                case 'cloud-edit':
                    cur_perm_text = gettext("Preview-Edit-on-Cloud");
                    break;
                case 'preview':
                    cur_perm_text = gettext("Preview-on-Cloud");
                    break;
            }

            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle(),
                'url': this.model.getWebUrl(),
                'name': this.model.get('folder_name'),
                'cur_perm_text': cur_perm_text
            });

            this.$el.html(this.template(obj));

            return this;
        }

    });

    return ShareAdminFolderView;
});

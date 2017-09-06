define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view',
    'app/views/share'
], function($, _, Backbone, Common, HLItemView, ShareView) {
    'use strict';

    var GroupRepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#group-repo-tmpl').html()),
        mobileTemplate: _.template($('#group-repo-mobile-tmpl').html()),

        events: {
            'click .cancel-share': 'unshare',
            'click .repo-share-btn': 'share'
        },

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);
            
            this.group_id = options.group_id;
            this.is_staff = options.is_staff;

            this.show_shared_by = true; // default
            if (options.show_shared_by !== undefined) { // e.g. views/group-item.js
                this.show_shared_by = options.show_shared_by;
            }

            this.listenTo(this.model, 'destroy', this.remove);
            this.show_admin = options.show_admin
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            var tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;
            $.extend(obj, {
                group_id: this.group_id,
                is_staff: this.is_staff,
                // for '#groups' (no 'share_from_me')
                share_from_me: app.pageOptions.username == this.model.get('owner') ? true : false,
                // 'owner_name' for '#groups', 'owner_nickname' for '#group/id/'
                owner_name: this.model.get('owner_nickname') || this.model.get('owner_name'),
                show_shared_by: this.show_shared_by,
                icon_url: icon_url,
                icon_title: this.model.getIconTitle(),
                is_admin: this.model.get('is_admin'),
                show_admin: this.show_admin
            });
            this.$el.html(tmpl(obj));
            return this;
        },

        share: function() {
            var options = {
                'is_repo_owner': true,
                'user_perm': 'rw',
                'repo_id': this.model.get('id'),
                'repo_encrypted': this.model.get('encrypted'),
                'is_dir': true,
                'dirent_path': '/',
                'obj_name': this.model.get('name')
            };
            new ShareView(options);
            return false;
        },

        unshare: function() {
            var lib_name = this.model.get('name');
            this.model.destroy({
                wait: true,
                success: function() {
                    var msg = gettext('Successfully unshared 1 item.');
                    Common.feedback(msg, 'success', Common.SUCCESS_TIMOUT);
                },
                error: function(model, response) {
                    var err;
                    if (response.responseText) {
                        err = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err, 'error');
                }
            });

            return false;
        }

    });

    return GroupRepoView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view',
    'app/views/share'
], function($, _, Backbone, Common, HLItemView, ShareView) {
    'use strict';

    var SharedRepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#shared-repo-tmpl').html()),
        mobileTemplate: _.template($('#shared-repo-mobile-tmpl').html()),

        events: {
            'click .repo-share-btn': 'share',
            'click .unshare-btn': 'removeShare'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        share: function() {
            var options = {
                'is_repo_owner': false,
                'is_admin': true, // only for shared repo
                'is_virtual': false,
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

        removeShare: function(e) {
            var _this = this,
                success_callback = function(data) {
                    Common.feedback(gettext('Success'), 'success', Common.SUCCESS_TIMOUT);
                    _this.$el.remove();
                    _this.collection.remove(_this.model, {silent: true});
                    if (_this.collection.length == 0) {
                        $('#repos-shared-to-me table').hide();
                        $('#repos-shared-to-me .empty-tips').show();
                    }
                };

            $.ajax({
                url: Common.getUrl({name: 'beshared_repo', repo_id: this.model.get('id')})
                    + "?share_type=personal&from=" + encodeURIComponent(this.model.get('owner')),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: success_callback
            });

            return false;
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            var tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;
            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle()
            });
            this.$el.html(tmpl(obj));
            return this;
        }

    });

    return SharedRepoView;
});

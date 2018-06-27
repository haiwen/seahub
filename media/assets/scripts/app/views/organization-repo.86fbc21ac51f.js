define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {
    'use strict';

    var OrganizationRepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#organization-repo-tmpl').html()),
        mobileTemplate: _.template($('#organization-repo-mobile-tmpl').html()),

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
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
        },

        events: {
            'click .cancel-share': 'removeShare'
        },

        removeShare: function() {
            var el = this.$el;
            var lib_name = this.model.get('name');
            $.ajax({
                url: Common.getUrl({
                    name: 'shared_repos',
                    repo_id: this.model.get('id')
                }) + "?share_type=public",
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function () {
                    el.remove();
                    var msg = gettext('Successfully unshared 1 item.');
                    Common.feedback(msg, 'success', Common.SUCCESS_TIMOUT);
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        }

    });

    return OrganizationRepoView;
});

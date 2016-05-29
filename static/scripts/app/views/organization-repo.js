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

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 96 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle()
            });
            this.$el.html(this.template(obj));
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
                    var msg = gettext('Successfully unshared {placeholder}').replace('{placeholder}', '<span class="op-target">' + Common.HTMLescape(lib_name) + '</span>');
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

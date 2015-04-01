define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var OrganizationRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#org-repo-tmpl').html()),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .cancel-share': 'removeShare'
        },

        initialize: function() {
        },

        removeShare: function(e) {
            var _this = this,
                success_callback = function(data) {
                    Common.feedback(gettext('Success'), 'success', Common.SUCCESS_TIMOUT);
                    _this.$el.remove();
                    _this.collection.remove(_this.model, {silent: true});
                    if (_this.collection.length == 0) {
                        $('#organization-repos table').hide();
                        $('#organization-repos .empty-tips').show();
                    };
                };

            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'ajax_repo_remove_share'}),
                'data': {
                         'repo_id': this.model.get('id'),
                         'share_type': this.model.get('share_type')
                        },
                'after_op_success': success_callback
            });
        },

        render: function() {
            var data, show_unshare_btn;
            if (this.model.get('share_from') == app.pageOptions.current_user || app.pageOptions.is_staff == true) {
                show_unshare_btn = true;
            } else {
                show_unshare_btn = false;
            };
            data = $.extend(this.model.toJSON(), {'show_unshare_btn': show_unshare_btn});
            this.$el.html(this.template(data));
            return this;
        },

        showAction: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideAction: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
        }
    });

    return OrganizationRepoView;
});

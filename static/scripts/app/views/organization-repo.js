define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var OrganizationRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#organization-repo-tmpl').html()),

        initialize: function() {
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .cancel-share': 'removeShare'
        },

        highlight: function() {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        removeShare: function(e) {
            var el = this.$el;
            Common.ajaxGet({
                get_url: Common.getUrl({
                    name: 'ajax_unset_inner_pub_repo',
                    repo_id: this.model.get('id')
                }),
                data: {
                    'permission': this.model.get('permission')
                },
                after_op_success: function () {
                    el.remove();
                    Common.feedback(gettext('Success'), 'success', Common.SUCCESS_TIMOUT);
                },
                after_op_error: Common.ajaxErrorHandler
            });
        }

    });

    return OrganizationRepoView;
});

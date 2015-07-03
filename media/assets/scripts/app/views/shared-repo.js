define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var SharedRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#shared-repo-tmpl').html()),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .unshare-btn': 'removeShare'
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
                        $('#repos-shared-to-me table').hide();
                        $('#repos-shared-to-me .empty-tips').show();
                    };
                };

            Common.ajaxGet({
                'get_url': Common.getUrl({name: 'ajax_repo_remove_share'}),
                'data': {
                         'repo_id': this.model.get('id'),
                         'from': this.model.get('owner'),
                         'share_type': this.model.get('share_type')
                        },
                'after_op_success': success_callback
            });
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
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

    return SharedRepoView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'text!' + app.config._tmplRoot + 'shared-repo.html'
], function($, _, Backbone, Common, reposTemplate) {
    'use strict';

    var SharedRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(reposTemplate),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .repo-delete-btn': 'delete',
            'click .repo-share-btn': 'share'
        },

        initialize: function() {
            this.listenTo(this.model, 'destroy', this.remove);
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
        },


    });

    return SharedRepoView;
});

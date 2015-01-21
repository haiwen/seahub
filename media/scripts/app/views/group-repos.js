define([
    'jquery',
    'underscore',
    'backbone',
    'text!' + app.config._tmplRoot + 'group-repos.html'
], function($, _, Backbone, reposTemplate) {
    'use strict';

    var GroupRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(reposTemplate),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .cancel-share': 'unshare'
        },
        
        initialize: function() {
            console.log('init GroupRepoView');
            Backbone.View.prototype.initialize.apply(this, arguments);
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

        unshare: function() {
            this.model.destroy();
        }

    });

    return GroupRepoView;
});

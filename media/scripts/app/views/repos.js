define([
    'jquery',
    'underscore',
    'backbone',
    'text!' + app.config._tmplRoot + 'repos.html'
], function($, _, Backbone, reposTemplate) {
    'use strict';

    var RepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(reposTemplate),

        initialize: function() {
            console.log('init RepoView');
            Backbone.View.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    return RepoView;
});

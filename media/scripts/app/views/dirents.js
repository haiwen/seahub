define([
    'jquery',
    'underscore',
    'backbone',
    'text!' + app.config._tmplRoot + 'dirents.html'
], function($, _, Backbone, direntsTemplate) {
    'use strict';

    var DirentView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(direntsTemplate),

        initialize: function() {
            console.log('init DirentView');
            Backbone.View.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    return DirentView;
});

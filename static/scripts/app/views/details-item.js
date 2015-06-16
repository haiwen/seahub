define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var DetailsItemView = Backbone.View.extend({

        template: _.template($('#details-item-tmpl').html()),

        initialize: function(options) {
            this.details_title = options.details_title;
            this.details = options.details;
        },

        render: function () {
            var data = {'details_title': this.details_title, 'details': this.details}
            this.$el.html(this.template(data));
            return this;
        }

    });

    return DetailsItemView;
});

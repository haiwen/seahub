define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/details'
], function($, _, Backbone, Common, DetailesView) {
    'use strict';

    var ActivityItem = Backbone.View.extend({
        tagName: 'li',

        className: 'event-item',

        template: _.template($('#activity-item-tmpl').html()),

        events: {
            'click .lsch': 'showDetails'
        },

        initialize: function(activity) {
            this.activity = activity;
        },

        showDetails: function () {
            var options = {
                'repo_id': this.activity.repo_id,
                'cmmt_id': this.activity.commit_id
            };
            new DetailesView(options);
        },

        render: function () {
            this.$el.html(this.template({'activity': this.activity}));
            return this;
        }
    });

    return ActivityItem;
});

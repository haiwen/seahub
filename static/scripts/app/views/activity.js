define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/activities',
    'app/views/activity-item'
], function($, _, Backbone, Common, ActivityCollection, ActivityItemView) {
    'use strict';

    var EventView = Backbone.View.extend({

        el: $('#events'),

        template: _.template($('#activities-date-tmpl').html()),

        events: {
            'click #events-more': 'getMoreActivites'
        },

        initialize: function () {
            this.activities = new ActivityCollection();

            this.$eventsBody = this.$('#events-body');
            this.$eventsMore = this.$('#events-more');
            this.$loadingTip = this.$('.loading-tip');

            this.moreOffset = 0;
        },

        getMoreActivites: function () {
            var _this = this;
            this.$loadingTip.show();
            this.activities.fetch({
                remove: false,
                data: {'start': _this.moreOffset},
                success: function() {
                    _this.render();
                }
            });
        },

        hide: function () {
            this.$el.hide();
        },

        render: function () {
            var activitiesJson = this.activities.toJSON(),
                len = activitiesJson.length,
                more = activitiesJson[len-1]['more'],
                allActivities = [];

            this.moreOffset = activitiesJson[len-1]['more_offset'];
            this.$loadingTip.hide();
            this.$eventsBody.empty().show();

            for (var i = 0; i < len; i++) {
                allActivities = allActivities.concat(activitiesJson[i]['events']);
            }

            var groupedActivities = _.groupBy(allActivities, 'date');

            for (var date in groupedActivities) {
                var $activitiesDate = $(this.template({'date': date})),
                    activityList = groupedActivities[date];

                this.$eventsBody.append($activitiesDate);

                _.each(activityList, function (activity) {
                    var view = new ActivityItemView(activity);
                    $activitiesDate.children('ol').append(view.render().el);
                });
            }

            if (more) {
                this.$eventsMore.show();
            }

        },

        show: function () {
            this.$el.show();
            this.$loadingTip.show();
            this.$eventsBody.hide();
            this.$eventsMore.hide();

            var _this = this;

            this.activities.fetch({
                data: {'start': 0},
                success: function() {
                    _this.render();
                }
            });
        }

    });

    return EventView;
});

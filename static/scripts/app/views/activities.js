define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/activities',
    'app/views/activity-item'
], function($, _, Backbone, Common, ActivityCollection, ActivityItemView) {
    'use strict';

    var ActivitiesView = Backbone.View.extend({

        el: '.main-panel',

        template: _.template($('#activities-tmpl').html()),

        activityGroupHdTemplate: _.template($('#activity-group-hd-tmpl').html()),
        activityGroupBdTemplate: _.template($('#activity-group-bd-tmpl').html()),

        initialize: function () {
            this.activities = new ActivityCollection();
            this.moreOffset = 0;
        },

        events: {
            'click #activities-more': 'getMoreActivities'
        },

        getMoreActivities: function () {
            var _this = this;
            this.$loadingTip.show();
            this.$activitiesMore.hide();
            this.activities.fetch({
                remove: false,
                data: {'start': _this.moreOffset},
                success: function() {
                    _this.renderActivities();
                }
            });
        },

        renderActivities: function () {
            var activitiesJson = this.activities.toJSON(),
                len = activitiesJson.length,
                more = activitiesJson[len-1]['more'],
                allActivities = [];

            this.$loadingTip.hide();
            this.$activitiesMore.hide();
            this.moreOffset = activitiesJson[len-1]['more_offset'];
            this.$activitiesBody.empty().show();

            for (var i = 0; i < len; i++) {
                allActivities = allActivities.concat(activitiesJson[i]['events']);
            }

            // return sth. like {2015-07-27: [{...},], 2015-06-04: [{...}] ...}
            var groupedActivities = _.groupBy(allActivities, 'date');

            var $groupDate, $groupActivities;
            for (var date in groupedActivities) {
                $groupDate = $(this.activityGroupHdTemplate({'date': date}));
                $groupActivities = $(this.activityGroupBdTemplate());

                _.each(groupedActivities[date], function(activity) {
                    var view = new ActivityItemView(activity);
                    $groupActivities.append(view.render().el);
                });

                this.$activitiesBody.append($groupDate).append($groupActivities);
            }

            if (more) {
                this.$activitiesMore.show();
            }

        },

        showActivities: function() {
            this.$activitiesBody.hide();
            this.$activitiesMore.hide();
            this.$loadingTip.show();

            var _this = this;

            this.activities.fetch({
                data: {'start': 0},
                success: function() {
                    _this.renderActivities();
                }
            });
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="activities"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$activitiesBody = this.$('#activities-body');
            this.$activitiesMore = this.$('#activities-more');
            this.$loadingTip = this.$('.loading-tip');
        },

        show: function() {
            this.renderMainCon();
            this.showActivities();
        },

        hide: function () {
            this.$mainCon.detach();
        }

    });

    return ActivitiesView;
});

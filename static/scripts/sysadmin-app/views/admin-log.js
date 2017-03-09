define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var AdminLogView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#admin-log-item-tmpl').html()),

        events: {
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = this.model.toJSON(),
                created_at = Moment(data['datetime']);

            data['time'] = created_at.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(created_at);

            this.$el.html(this.template(data));

            return this;
        }

    });

    return AdminLogView;
});

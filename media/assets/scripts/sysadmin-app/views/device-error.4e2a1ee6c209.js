define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var DeviceErrorView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#device-error-item-tmpl').html()),

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = this.model.toJSON();
            var error_time = Moment(data['error_time']);
            data['time'] = error_time.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(error_time);
            this.$el.html(this.template(data));
            return this;
        }

    });

    return DeviceErrorView;
});

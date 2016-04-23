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

        template: _.template($('#admin-device-error-tmpl').html()),

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = this.model.toJSON();
            var last_accessed = Moment(data['last_accessed']);
            data['time'] = last_accessed.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(last_accessed);
            this.$el.html(this.template(data));
            return this;
        }

    });

    return DeviceErrorView;
});

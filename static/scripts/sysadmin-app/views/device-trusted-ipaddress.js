define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var DeviceTrustedIpAddressView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#device-trusted-ip-item-tmpl').html()),

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = this.model.toJSON();
            this.$el.html(this.template(data));
            return this;
        }
    });

    return DeviceTrustedIpAddressView;
});

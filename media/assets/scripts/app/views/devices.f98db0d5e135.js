define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/device',
    'app/collections/devices',
], function($, _, Backbone, Common, Device, DevicesCollection) {
    'use strict';

    var DevicesView = Backbone.View.extend({

        el: $('#devices'),

        initialize: function() {
            this.$table = this.$('table');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            this.devices = new DevicesCollection();
            this.listenTo(this.devices, 'reset', this.reset);

        },

        addOne: function(device) {
            var view = new Device({model: device});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$tableBody.empty();
            this.$loadingTip.hide();
            this.devices.each(this.addOne, this);
            if (this.devices.length) {
                this.$emptyTip.hide();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        hide: function() {
            this.$el.hide();
        },

        show: function() {
            this.$el.show();
            this.$table.hide();
            this.$loadingTip.show();
            this.devices.fetch({reset: true});
        }

    });

    return DevicesView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/device',
    'app/collections/devices'
], function($, _, Backbone, Common, Device, DevicesCollection) {
    'use strict';

    var DevicesView = Backbone.View.extend({

        id: 'devices',

        template: _.template($('#devices-tmpl').html()),

        initialize: function() {
            this.devices = new DevicesCollection();
            this.listenTo(this.devices, 'reset', this.reset);

            this.render();
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

        render: function() {
            this.$el.html(this.template());

            this.$table = this.$('table');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            return this;
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.devices.fetch({reset: true});
        },

        hide: function() {
            this.$el.detach();
        }

    });

    return DevicesView;
});

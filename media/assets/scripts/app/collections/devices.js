define([
    'underscore',
    'backbone',
    'common',
    'app/models/device'
], function(_, Backbone, Common, Device) {
    'use strict';

    var DevicesCollection = Backbone.Collection.extend({
        model: Device,
        url: function () {
            return Common.getUrl({name: 'devices'});
        }
    });

    return DevicesCollection;
});

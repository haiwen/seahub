define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/device-error'
], function(_, Backbone, Common, DeviceError) {
    'use strict';

    var DeviceErrorCollection = Backbone.Collection.extend({
        model: DeviceError,
        url: function () {
            return Common.getUrl({name: 'admin-device-errors'});
        }
    });

    return DeviceErrorCollection;
});

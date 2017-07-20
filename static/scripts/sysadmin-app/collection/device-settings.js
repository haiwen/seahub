define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/device-setting'
], function(_, Backbone, Common, DeviceSetting){
    'use strict';

    var DeviceSettingCollection = Backbone.Collection.extend({
        model: DeviceSetting,
        url: function() {
            return Common.getUrl({name: 'admin-device-settings'});
        }
    });

    return DeviceSettingCollection;
});

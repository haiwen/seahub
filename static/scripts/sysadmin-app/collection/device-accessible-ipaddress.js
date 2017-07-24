define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/device-accessible-ipaddress'
], function(_, Backbone, Common, DeviceAccessibleIpAddress){
    'use strict';

    var DeviceAccessibleIpAddressCollection = Backbone.Collection.extend({
        model: DeviceAccessibleIpAddress,
        url: function() {
            return Common.getUrl({name: 'admin-device-accessible-ip-setting'});
        }
    });

    return DeviceAccessibleIpAddressCollection;
});

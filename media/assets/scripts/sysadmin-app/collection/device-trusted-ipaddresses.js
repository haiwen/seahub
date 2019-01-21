define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/device-trusted-ipaddress'
], function(_, Backbone, Common, DeviceTrustedIPAddress){
    'use strict';

    var DeviceTrustedIPAddressCollection = Backbone.Collection.extend({
        model: DeviceTrustedIPAddress,
        url: function() {
            return Common.getUrl({name: 'admin-device-trusted-ip'});
        }
    });

    return DeviceTrustedIPAddressCollection;
});

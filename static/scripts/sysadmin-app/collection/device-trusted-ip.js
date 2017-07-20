define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/device-trusted-ip'
], function(_, Backbone, Common, DeviceTrustedIp){
    'use strict';

    var DeviceTrustedIpCollection = Backbone.Collection.extend({
        model: DeviceTrustedIp,
        url: function() {
            return Common.getUrl({name: 'admin-device-trusted-ip'});
        }
    });

    return DeviceTrustedIpCollection;
});

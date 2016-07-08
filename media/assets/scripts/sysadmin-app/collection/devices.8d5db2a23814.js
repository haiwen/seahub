define([
    'underscore',
    'backbone',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/device'
], function(_, Backbone, BackbonePaginator, Common, Device) {
    'use strict';

    var DeviceCollection = Backbone.PageableCollection.extend({
        model: Device,
        state: {pageSize: 50,},
        parseState: function(data) {
            return {hasNextPage: data[0].has_next_page};
        },
        url: function () {
            return Common.getUrl({name: 'admin-devices'});
        },
        parseRecords: function(data) {
            return data[1];
        }
    });

    return DeviceCollection;
});

define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/device'
], function(_, BackbonePaginator, Common, DeviceModel) {
    'use strict';

    var DeviceCollection = Backbone.PageableCollection.extend({
        model: DeviceModel,
        state: {pageSize: 50},
        parseState: function(data) {
            return {hasNextPage: data[0].has_next_page, current_page: data[0].current_page};
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

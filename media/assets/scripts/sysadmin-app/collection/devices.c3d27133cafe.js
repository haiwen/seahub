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
            return data.page_info; // {'has_next_page': has_next_page, 'current_page': current_page}
        },
        url: function () {
            return Common.getUrl({name: 'admin-devices'});
        },
        parseRecords: function(data) {
            return data.devices;
        }
    });

    return DeviceCollection;
});

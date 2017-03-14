define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/admin-log'
], function(_, BackbonePaginator, Common, AdminLogModel) {
    'use strict';

    var AdminLogCollection = Backbone.PageableCollection.extend({

        model: AdminLogModel,

        url: function() {
            return Common.getUrl({name: 'admin-logs'});
        },

        state: {
            firstPage: 1,
            pageSize: 100
        },

        // Setting a parameter mapping value to null removes it from the query string
        queryParams: {
            currentPage: "page",
            pageSize: "per_page",
            totalPages: null,
            totalRecords: null
        },

        parseState: function (resp) {
            return {totalRecords: resp.total_count};
        },

        parseRecords: function (resp) {
            return resp.data;
        }
    });
    return AdminLogCollection;
});

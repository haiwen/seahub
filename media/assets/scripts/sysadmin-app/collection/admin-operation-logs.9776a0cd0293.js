define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/admin-operation-log'
], function(_, BackbonePaginator, Common, AdminOperationLogModel) {
    'use strict';

    var AdminOperationLogCollection = Backbone.PageableCollection.extend({

        model: AdminOperationLogModel,

        url: function() {
            return Common.getUrl({name: 'admin-operation-logs'});
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
    return AdminOperationLogCollection;
});

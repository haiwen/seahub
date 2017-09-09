define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/admin-login-log'
], function(_, BackbonePaginator, Common, AdminLoginLogModel) {
    'use strict';

    var AdminLoginLogCollection = Backbone.PageableCollection.extend({

        model: AdminLoginLogModel,

        url: function() {
            return Common.getUrl({name: 'admin-login-logs'});
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
    return AdminLoginLogCollection;
});

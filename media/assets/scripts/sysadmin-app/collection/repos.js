define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/repo'
], function(_, BackbonePaginator, Common, RepoModel) {
    'use strict';

    var RepoCollection = Backbone.PageableCollection.extend({
        model: RepoModel,
        state: {pageSize: 100},
        parseState: function(data) {
            return data.page_info; // {'has_next_page': has_next_page, 'current_page': current_page}   
        },
        parseRecords: function(data) {
            return data.repos;
        },
        url: function () {
            return Common.getUrl({name: 'admin-libraries'});
        }
    });

    return RepoCollection;
});

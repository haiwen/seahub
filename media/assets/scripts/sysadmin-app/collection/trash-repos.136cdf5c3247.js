define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/trash-repo'
], function(_, BackbonePaginator, Common, TrashRepoModel) {
    'use strict';

    var TrashRepoCollection = Backbone.PageableCollection.extend({
        model: TrashRepoModel,

        url: function () {
            return Common.getUrl({name: 'admin-trash-libraries'});
        },

        state: {pageSize: 100},

        parseState: function(data) {
            return data.page_info; // {'has_next_page': has_next_page, 'current_page': current_pag
        },

        parseRecords: function(data) {
            return data.repos;
        }

    });

    return TrashRepoCollection;
});

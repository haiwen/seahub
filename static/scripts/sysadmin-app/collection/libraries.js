define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/library'
], function(_, BackbonePaginator, Common, LibraryModel) {
    'use strict';

    var LibraryCollection = Backbone.PageableCollection.extend({
        model: LibraryModel,
        state: {pageSize: 100},
        parseState: function(data) {
            return {hasNextPage: data[0].has_next_page, current_page: data[0].current_page};
        },
        parseRecords: function(data) {
            return data[1];
        },
        url: function () {
            return Common.getUrl({name: 'admin-libraries'});
        }
    });

    return LibraryCollection;
});

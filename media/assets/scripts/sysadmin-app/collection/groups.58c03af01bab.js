define([
    'underscore',
    'backbone.paginator',
    'common',
    'sysadmin-app/models/group'
], function(_, BackbonePaginator, Common, GroupModel) {
    'use strict';

    var GroupCollection = Backbone.PageableCollection.extend({
        model: GroupModel,
        state: {pageSize: 100},
        parseState: function(data) {
            return data.page_info; // {'has_next_page': has_next_page, 'current_page': current_page}
        },
        parseRecords: function(data) {
            return data.groups;
        },
        url: function() {
            return Common.getUrl({name: 'admin-groups'});
        }
    });

    return GroupCollection;
});

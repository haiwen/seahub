define([
    'underscore',
    'backbone',
    'common',
    'app/models/all-groups-repo'
], function(_, Backbone, Common, AllGroupsRepo) {
    'use strict';

    var AllGroupsReposCollection = Backbone.Collection.extend({
        model: AllGroupsRepo,
        url: function () {
            return Common.getUrl({name: 'all_groups_repos'});
        },
        comparator: function(a, b) { // a, b: model
            return Common.compareTwoWord(a.get('group_name'), b.get('group_name'));
        }
    });

    return AllGroupsReposCollection;
});

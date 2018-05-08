define([
    'underscore',
    'backbone',
    'common',
    'app/models/group-repo'
], function(_, Backbone, Common, GroupRepo) {
    'use strict';

    var GroupRepoCollection = Backbone.Collection.extend({
        model: GroupRepo,
        comparator: -'mtime',

        url: function() {
            return Common.getUrl({name: 'group_owned_repos', group_id: this.group_id});
        },

        parse: function(data) {
            //return data.repos;
        },

        setGroupID: function(group_id) {
            this.group_id = group_id;
        }
    });

    return GroupRepoCollection;
});

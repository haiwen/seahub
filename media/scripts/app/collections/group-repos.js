define([
    'underscore',
    'backbone',
    'app/models/group-repo'
], function(_, Backbone, GroupRepo) {
    'use strict';

    var GroupRepoCollection = Backbone.Collection.extend({
        model: GroupRepo,
        url: app.pageOptions.groupReposUrl
    });

    return new GroupRepoCollection();
});

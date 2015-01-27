define([
    'underscore',
    'backbone',
    'app/models/group-repo'
], function(_, Backbone, GroupRepo) {
    'use strict';

    var GroupRepoCollection = Backbone.Collection.extend({
        model: GroupRepo,
        url: app.pageOptions.groupReposUrl,

        comparator: -'mtime',

        // initialize: function( ) {

        // },


    });

    return new GroupRepoCollection();
});

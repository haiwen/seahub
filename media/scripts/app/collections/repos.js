define([
    'underscore',
    'backbone',
    'app/models/repo'
], function(_, Backbone, Repo) {
    'use strict';

    var RepoCollection = Backbone.Collection.extend({
        model: Repo,
        url: '/api2/repos/',

        initialize: function() {
            console.log('init RepoCollection');
        }

    });

    return new RepoCollection();
});

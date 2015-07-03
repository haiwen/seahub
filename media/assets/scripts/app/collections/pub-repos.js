define([
    'underscore',
    'backbone',
    'app/models/pub-repo'
], function(_, Backbone, PubRepo) {
    'use strict';

    var PubRepoCollection = Backbone.Collection.extend({
        model: PubRepo,
        url: app.pageOptions.pubReposUrl,

        comparator: -'mtime'

    });

    return PubRepoCollection;
});

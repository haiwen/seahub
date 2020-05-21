define([
    'underscore',
    'backbone',
    'common',
    'app/models/pub-repo'
], function(_, Backbone, Common, PubRepo) {
    'use strict';

    var PubRepoCollection = Backbone.Collection.extend({
        model: PubRepo,

        comparator: -'mtime',

        url: function() {
            return Common.getUrl({name: 'pub_repos'});
        }

    });

    return PubRepoCollection;
});

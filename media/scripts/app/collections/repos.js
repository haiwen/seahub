define([
    'underscore',
    'backbone',
    'app/models/repo'
], function(_, Backbone, Repo) {
    'use strict';

    var RepoCollection = Backbone.Collection.extend({
        model: Repo,
        url: app.pageOptions.reposUrl,

        initialize: function() {
            console.log('init RepoCollection');
        },

        fetch: function(options) {
            // override default fetch url
            options = options ? _.clone(options) : {};
            options.url = this.url + '?type=mine'

            //call Backbone's fetch
            return Backbone.Collection.prototype.fetch.call(this, options);
        }

    });

    return new RepoCollection();
});

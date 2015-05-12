define([
    'underscore',
    'backbone',
    'app/models/repo'
], function(_, Backbone, Repo) {
    'use strict';

    var RepoCollection = Backbone.Collection.extend({
        model: Repo,
        url: app.pageOptions.reposUrl,
        type: 'mine',

        initialize: function(options) {
            //console.log('init RepoCollection');
            if (options) {
                this.type = options.type ? options.type : 'mine';
            }
        },

        fetch: function(options) {
            // override default fetch url
            options = options ? _.clone(options) : {};
            options.url = this.url + '?type=' + this.type;

            //call Backbone's fetch
            return Backbone.Collection.prototype.fetch.call(this, options);
        },

        create: function(model, options) {
            // override default create url
            options = options ? _.clone(options) : {};
            options.url = this.url + '?from=web';

            //call Backbone's create
            return Backbone.Collection.prototype.create.call(this, model, options);
        }
    });

    return RepoCollection;
});

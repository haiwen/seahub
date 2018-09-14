define([
    'underscore',
    'backbone',
    'common',
    'app/models/repo'
], function(_, Backbone, Common, Repo) {
    'use strict';

    var RepoCollection = Backbone.Collection.extend({
        model: Repo,
        type: 'mine',

        url: function() {
            return Common.getUrl({name: 'repos'});
        },

        initialize: function(options) {
            if (options) {
                this.type = options.type ? options.type : 'mine';
            }
        },

        fetch: function(options) {
            // override default fetch url
            options = options ? _.clone(options) : {};
            options.url = this.url() + '?type=' + this.type;

            //call Backbone's fetch
            return Backbone.Collection.prototype.fetch.call(this, options);
        },

        create: function(model, options) {
            // override default create url
            options = options ? _.clone(options) : {};
            options.url = this.url() + '?from=web';

            //call Backbone's create
            return Backbone.Collection.prototype.create.call(this, model, options);
        }
    });

    return RepoCollection;
});

define([
    'underscore',
    'backbone',
    'app/models/repo'
], function(_, Backbone, Repo) {
    'use strict';

    var RepoCollection = Backbone.Collection.extend({
        model: Repo,
        url: function () {
            return app.pageOptions.reposUrl + '?type=' + this.type;
        },
        type: 'mine',

        initialize: function(options) {
            if (options) {
                this.type = options.type ? options.type : 'mine';
            }
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

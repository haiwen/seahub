define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/repo'
], function(_, Backbone, Common, RepoModel) {
    'use strict';

    var RepoCollection = Backbone.Collection.extend({

        model: RepoModel,

        url: function () {
            return Common.getUrl({name: 'admin-libraries'});
        },

        parse: function(data) {
            this.search_name = data.name;
            this.search_owner = data.owner;
            return data.repos;
        }
    });

    return RepoCollection;
});

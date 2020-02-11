define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/trash-repo'
], function(_, Backbone, Common, TrashRepoModel) {
    'use strict';

    var TrashRepoCollection = Backbone.Collection.extend({
        model: TrashRepoModel,

        url: function () {
            return Common.getUrl({name: 'admin-trash-libraries'});
        },

        parse: function(data) {
            this.search_owner = data.search_owner;
            return data.repos;
        }

    });

    return TrashRepoCollection;
});

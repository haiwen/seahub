define([
    'underscore',
    'backbone',
    'common',
    'app/models/deleted-repo'
], function(_, Backbone, Common, DeletedRepo) {
    'use strict';

    var collection = Backbone.Collection.extend({
        model: DeletedRepo,

        url: function () {
            return Common.getUrl({name: 'deleted_repos'});
        }
    });

    return collection;
});

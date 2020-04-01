define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var collection = Backbone.Collection.extend({

        url: function() {
            return Common.getUrl({name: 'file-comments', repo_id: this.repo_id});
        },

        parse: function(data) {
            return data.comments; // return the array
        },

        setData: function(repo_id) {
            this.repo_id = repo_id;
        }
    });

    return collection;
});

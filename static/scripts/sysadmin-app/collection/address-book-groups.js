define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var collection = Backbone.Collection.extend({
        url: function() {
            return Common.getUrl({name: 'admin-address-book-groups'});
        },

        parse: function(data) {
            return data.data; // return the array
        }

    });

    return collection;
});

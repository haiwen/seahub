define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var collection = Backbone.Collection.extend({
        setOptions: function(options) {
            this.options = options;
        },

        url: function() {
            return Common.getUrl({
                name: 'admin-address-book-group',
                group_id: this.options.group_id
            });
        },

        parse: function(data) {
            this.data = data;
            return data.groups;
        }

    });

    return collection;
});

define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var collection = Backbone.Collection.extend({
        url: function() {
            var url_options;
            if (app.pageOptions.org_id) { // org admin
                url_options = {
                    name: 'org-admin-address-book-groups',
                    org_id: app.pageOptions.org_id
                };
            } else {
                url_options = {
                    name: 'admin-address-book-groups'
                };
            }
            return Common.getUrl(url_options);
        },

        parse: function(data) {
            return data.data; // return the array
        }

    });

    return collection;
});

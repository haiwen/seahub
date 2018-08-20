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
            var url_options;
            if (app.pageOptions.org_id) { // org admin
                url_options = {
                    name: 'org-admin-address-book-group',
                    org_id: app.pageOptions.org_id,
                    group_id: this.options.group_id
                };
            } else {
                url_options = {
                    name: 'admin-address-book-group',
                    group_id: this.options.group_id
                };
            }

            return Common.getUrl(url_options);
        },

        parse: function(data) {
            this.data = data;
            return data.groups;
        }

    });

    return collection;
});

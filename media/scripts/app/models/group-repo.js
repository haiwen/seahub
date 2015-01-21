define([
    'underscore',
    'backbone'
], function(_, Backbone) {
    'use strict';

    var GroupRepo = Backbone.Model.extend({

        defaults: {
            id: "",
            name: "",
            desc: "",
            mtime: "",
            encrypted: false,
            permission: "",
            owner: gettext("Unknown")
        }

    });

    return GroupRepo;
});

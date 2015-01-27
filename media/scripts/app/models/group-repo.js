define([
    'underscore',
    'backbone'
], function(_, Backbone) {
    'use strict';

    var GroupRepo = Backbone.Model.extend({

        defaults: {
            id: null,
            name: "",
            desc: "",
            mtime: 0,
            encrypted: false,
            permission: "r",
            owner: "-",
            owner_nickname: "-"
        }

    });

    return GroupRepo;
});

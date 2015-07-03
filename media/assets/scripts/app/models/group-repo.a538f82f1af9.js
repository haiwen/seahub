define([
    'underscore',
    'backbone',
    'app/models/repo'
], function(_, Backbone, Repo) {
    'use strict';

    var GroupRepo = Repo.extend({
        defaults: {
            permission: "r"
        }
    });

    _.extend(GroupRepo.prototype.defaults, Repo.prototype.defaults);

    return GroupRepo;
});

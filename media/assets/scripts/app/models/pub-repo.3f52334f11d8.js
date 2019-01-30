define([
    'underscore',
    'backbone',
    'app/models/repo'
], function(_, Backbone, Repo) {
    'use strict';

    var PubRepo = Repo.extend({
        defaults: {
            permission: "r",
        }
    });

    _.extend(PubRepo.prototype.defaults, Repo.prototype.defaults);

    return PubRepo;
});

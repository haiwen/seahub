define([
    'underscore',
    'backbone',
    'common',
    'app/models/share-admin-repo'
], function(_, Backbone, Common, ShareAdminRepo) {
    'use strict';

    var ShareAdminRepoCollection = Backbone.Collection.extend({

        model: ShareAdminRepo,

        url: function() {
            return Common.getUrl({name: 'share_admin_repos'});
        }

    });

    return ShareAdminRepoCollection;
});

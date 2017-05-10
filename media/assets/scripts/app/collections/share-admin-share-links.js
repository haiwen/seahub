define([
    'underscore',
    'backbone',
    'common',
    'app/models/share-admin-share-link'
], function(_, Backbone, Common, ShareAdminShareLink) {
    'use strict';

    var ShareAdminShareLinkCollection = Backbone.Collection.extend({

        model: ShareAdminShareLink,

        url: function() {
            return Common.getUrl({name: 'share_admin_share_links'});
        }

    });

    return ShareAdminShareLinkCollection;
});

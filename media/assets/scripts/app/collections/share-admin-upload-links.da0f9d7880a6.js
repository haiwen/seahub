define([
    'underscore',
    'backbone',
    'common',
    'app/models/share-admin-upload-link'
], function(_, Backbone, Common, ShareAdminUploadLink) {
    'use strict';

    var ShareAdminUploadLinkCollection = Backbone.Collection.extend({

        model: ShareAdminUploadLink,

        url: function() {
            return Common.getUrl({name: 'share_admin_upload_links'});
        }

    });

    return ShareAdminUploadLinkCollection;
});

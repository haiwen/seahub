define([
    'underscore',
    'backbone',
    'common',
    'app/models/share-admin-folder'
], function(_, Backbone, Common, ShareAdminFolder) {
    'use strict';

    var ShareAdminFolderCollection = Backbone.Collection.extend({

        model: ShareAdminFolder,

        url: function() {
            return Common.getUrl({name: 'share_admin_folders'});
        }

    });

    return ShareAdminFolderCollection;
});

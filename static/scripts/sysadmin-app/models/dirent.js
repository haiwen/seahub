define([
    'underscore',
    'backbone',
    'common',
], function(_, Backbone, Common) {
    'use strict';

    var DirentModel = Backbone.Model.extend({

        // get the absolute path within the library
        getPath: function() {
            return Common.pathJoin([this.collection.path, this.get('obj_name')]);
        },

        // return the URL to visit the folder or file
        getWebUrl: function() {
            var dir = this.collection;
            var dirent_path = this.getPath();

            if (this.get('is_file')) {
                return '';
            } else {
                return '#libs/' + dir.repo_id + Common.encodePath(dirent_path);
            }
        },

        // only for file
        getDownloadUrl: function() {
            var dir = this.collection;
            var dirent_path = this.getPath();

            return app.config.siteRoot + "api/v2.1/admin/libraries/" + dir.repo_id
                + "/dirent/?path=" + encodeURIComponent(dirent_path) + "&dl=1";
        },

        getDeleteUrl: function() {
            var dir = this.collection;
            var dirent_path = this.getPath();

            return app.config.siteRoot + "api/v2.1/admin/libraries/" + dir.repo_id
                + "/dirent/?path=" + encodeURIComponent(dirent_path);
        },

        getIconUrl: function(size) {
            if (this.get('is_file')) {
                return Common.getFileIconUrl(this.get('obj_name'), size);
            } else {
                var is_readonly = this.get('perm') == 'r';
                return Common.getDirIconUrl(is_readonly, size);
            }
        }
    });

    return DirentModel;
});

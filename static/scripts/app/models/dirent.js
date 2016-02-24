define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var Dirent = Backbone.Model.extend({

        // get the absolute path within the library
        getPath: function() {
            return Common.pathJoin([this.collection.path, this.get('obj_name')]);
        },

        // return the URL to visit the folder or file
        getWebUrl: function() {
            var dir = this.collection;
            var dirent_path = this.getPath();

            if (this.get('is_dir')) {
                if (dir.category) {
                    return "#" + dir.category + "/lib/" + dir.repo_id + Common.encodePath(dirent_path);
                } else {
                    return "#lib/" + dir.repo_id + Common.encodePath(dirent_path);
                }
            } else {
                return app.config.siteRoot + "lib/" + dir.repo_id
                    + "/file" + Common.encodePath(dirent_path);
            }
        },

        // return the URL to download the folder or file
        getDownloadUrl: function() {
            var dir = this.collection;
            var dirent_path = this.getPath();

            if (this.get('is_dir')) {
                return app.config.siteRoot + "repo/download_dir/" + dir.repo_id
                    + "/?p=" + Common.encodePath(dirent_path);
            } else {
                return app.config.siteRoot + "lib/" + dir.repo_id
                    + "/file" + Common.encodePath(dirent_path) + "?dl=1";
            }
        }

    });

    return Dirent;
});

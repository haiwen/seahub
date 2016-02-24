define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
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
        },

        // We can't use Backbone.sync() here because the URL for a dirent
        // is not a standard RESTful one
        deleteFromServer: function(options) {
            var dir = this.collection;
            var path = this.getPath();
            var model = this;

            var opts = {
                repo_id: dir.repo_id,
                name: this.get('is_dir') ? 'del_dir' : 'del_file'
            };
            $.ajax({
                url: Common.getUrl(opts) + '?p=' + encodeURIComponent(path),
                type: 'DELETE',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function(data) {
                    // We don't understand how the event actually work in Backbone
                    // It is safer to call dir.remove() directly.
                    dir.remove(model);
                    // this.trigger('destroy');
                    if (options.success)
                        options.success(data);
                },
                error: function(xhr) {
                    if (options.error)
                        options.error(xhr);
                }
            });
        }

    });

    return Dirent;
});

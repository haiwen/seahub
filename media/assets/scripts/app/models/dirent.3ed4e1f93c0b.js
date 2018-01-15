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

        getIconUrl: function(size) {
            if (this.get('is_dir')) {
                var is_readonly = this.get('perm') == 'r';
                return Common.getDirIconUrl(is_readonly, size);
            } else {
                return Common.getFileIconUrl(this.get('obj_name'), size);
            }
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
                    if (options.success) {
                        options.success(data);
                    }
                },
                error: function(xhr) {
                    if (options.error) {
                        options.error(xhr);
                    }
                }
            });
        },

        rename: function(options) {
            var dir = this.collection;
            var _this = this;

            var opts = {
                repo_id: dir.repo_id,
                name: this.get('is_dir') ? 'rename_dir' : 'rename_file'
            };

            var post_data = {
                'operation': 'rename',
                'newname': options.newname
            };

            $.ajax({
                url: Common.getUrl(opts) + '?p=' + encodeURIComponent(this.getPath()),
                type: 'POST',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: post_data,
                success: function(data) {
                    var renamed_dirent_data = {
                        'obj_name': data.obj_name,
                        'last_modified': new Date().getTime()/1000,
                        'last_update': gettext("Just now")
                    };
                    if (!_this.get('is_dir')) {
                        $.extend(renamed_dirent_data, {
                            'starred': false
                        });
                    }
                    _this.set(renamed_dirent_data)
                    if (options.success) {
                        options.success(data);
                    }
                },
                error: function(xhr) {
                    if (options.error) {
                        options.error(xhr);
                    }
                }
            });
        },

        lockOrUnlockFile: function(options) {
            var dir = this.collection,
                filepath = this.getPath();

            $.ajax({
                url: Common.getUrl({
                    name: 'lock_or_unlock_file',
                    repo_id: dir.repo_id
                }) + '?p=' + encodeURIComponent((filepath)),
                type: 'PUT',
                dataType: 'json',
                data: {
                    'operation': options.op,
                    'p': filepath
                },
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    options.success();
                },
                error: function(xhr) {
                    options.error(xhr);
                }
            });
        },

        lockFile: function(options) {
            var _this = this;
            this.lockOrUnlockFile({
                op: 'lock',
                success: function() {
                    _this.set({
                        'is_locked': true,
                        'locked_by_me': true,
                        'lock_owner_name': app.pageOptions.name
                    });
                    if (options.success) {
                        options.success();
                    }
                },
                error: function(xhr) {
                    if (options.error) {
                        options.error(xhr)
                    }
                }
            });
            return false;
        },

        unlockFile: function(options) {
            var _this = this;
            this.lockOrUnlockFile({
                op: 'unlock',
                success: function() {
                    _this.set({
                        'is_locked': false
                    });
                    if (options.success) {
                        options.success();
                    }
                },
                error: function(xhr) {
                    if (options.error) {
                        options.error(xhr)
                    }
                }
            });
            return false;
        },

    });

    return Dirent;
});

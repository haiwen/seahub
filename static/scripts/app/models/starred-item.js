define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var StarredItem = Backbone.Model.extend({

        getRepoUrl: function() {
            return "#common/lib/" + this.get('repo_id') + "/";
        },

        getIconUrl: function(size) {
            if (this.get('is_dir')) {
                return Common.getDirIconUrl(false, size);
            } else {
                return Common.getFileIconUrl(this.get('obj_name'), size);
            }
        },

        // return the URL to visit the folder or file
        getDirentUrl: function() {
            var path = this.get('path'),
                repo_id = this.get('repo_id');

            if (this.get('is_dir')) {
                return "#common/lib/" + repo_id + Common.encodePath(path);
            } else {
                return "lib/" + repo_id + "/file" + Common.encodePath(path);
            }
        }

    });

    return StarredItem;
});

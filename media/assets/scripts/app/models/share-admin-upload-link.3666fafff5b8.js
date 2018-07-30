define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var ShareAdminUploadLink = Backbone.Model.extend({
        getIconUrl: function(size) {
            return Common.getDirIconUrl(false , size);
        },

        getWebUrl: function() {
            var repo_id = this.get('repo_id');
            var dirent_path = this.get('path');
            return "#common/lib/" + repo_id + Common.encodePath(dirent_path);
        }
    });

    return ShareAdminUploadLink;
});

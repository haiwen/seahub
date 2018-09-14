define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var ShareAdminFolder = Backbone.Model.extend({

        getWebUrl: function() {
            var path = this.get('path'),
                repo_id = this.get('repo_id');

            return "#my-libs/lib/" + repo_id + Common.encodePath(path);
        },

        getIconUrl: function(size) {
            var is_readonly = this.get('share_permission') == "r" ? true : false;
            return Common.getDirIconUrl(is_readonly, size);
        },

        getIconTitle: function() {
            return Common.getFolderIconTitle({
                'permission': this.get('share_permission')
            });
        }   

    });

    return ShareAdminFolder;
});

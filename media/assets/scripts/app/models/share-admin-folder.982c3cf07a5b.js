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
            var icon_title = ''; 
            if (this.get('share_permission') == "rw") {
                icon_title = gettext("Read-Write");
            } else {
                icon_title = gettext("Read-Only");
            }   
            return icon_title;
        }   

    });

    return ShareAdminFolder;
});

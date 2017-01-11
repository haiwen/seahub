define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var ShareAdminRepo = Backbone.Model.extend({

        getWebUrl: function() {
            return "#common/lib/" + this.get('repo_id') + "/";
        },

        getIconUrl: function(size) {
            var is_readonly = this.get('share_permission') == "r" ? true : false;
            return Common.getLibIconUrl(false, is_readonly, size);
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

    return ShareAdminRepo;
});

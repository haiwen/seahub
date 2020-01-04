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
            return Common.getLibIconTitle({
                'encrypted': this.get('encrypted'),
                'is_admin': this.get('is_admin'),
                'permission': this.get('share_permission')
            });
        }

    });

    return ShareAdminRepo;
});

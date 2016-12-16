define([
    'underscore',
    'backbone',
    'common',
], function(_, Backbone, Common) {
    'use strict';

    var RepoModel = Backbone.Model.extend({
        getIconUrl: function(size) {
            var is_encrypted = this.get('encrypted');
            return Common.getLibIconUrl(is_encrypted, false, size);
        },

        getIconTitle: function() {
            var icon_title = '';
            if (this.get('encrypted')) {
                icon_title = gettext("Encrypted library");
            } else {
                icon_title = gettext("Read-Write library");
            }

            return icon_title;
        }
    });

    return RepoModel;
});

define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var model = Backbone.Model.extend({

        getIconUrl: function(size) {
            var is_encrypted = this.get('encrypted');
            var is_readonly = false;
            return Common.getLibIconUrl(is_encrypted, is_readonly, size);
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

    return model;
});

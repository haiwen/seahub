define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {

    'use strict';

    var GroupRepo = Backbone.Model.extend({

        getIconUrl: function(size) {
            var is_encrypted = this.get('encrypted');
            var is_readonly = this.get('permission') == "r" ? true : false;
            return Common.getLibIconUrl(is_encrypted, is_readonly, size);
        },

        getIconTitle: function() {
            var is_encrypted = this.get('encrypted');
            var is_readonly = this.get('permission') == "r" ? true : false;
            return Common.getLibIconTitle(is_encrypted, is_readonly);
        }
    });

    return GroupRepo;
});

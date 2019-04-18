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
            return Common.getLibIconTitle({
                'encrypted': this.get('encrypted'),
                'permission': 'rw'
            });

        }
    });

    return RepoModel;
});

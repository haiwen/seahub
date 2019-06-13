define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var TrashRepo = Backbone.Model.extend({
        getIconUrl: function(size) {
            return Common.getLibIconUrl(false, false, size);
        },

        getIconTitle: function() {
            return  gettext("Read-Write library");
        }
    });

    return TrashRepo;
});

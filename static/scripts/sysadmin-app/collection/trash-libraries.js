define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/trash-library'
], function(_, Backbone, Common, TrashLibraryModel) {
    'use strict';

    var TrashLibraryCollection = Backbone.Collection.extend({
        model: TrashLibraryModel,
        url: function () {
            return Common.getUrl({name: 'admin-trash-libraries'});
        }
    });

    return TrashLibraryCollection;
});

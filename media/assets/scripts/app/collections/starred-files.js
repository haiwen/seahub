define([
    'underscore',
    'backbone',
    'common',
    'app/models/starred-file'
], function(_, Backbone, Common, StarredFile) {
    'use strict';

    var StarredFileCollection = Backbone.Collection.extend({
        model: StarredFile,
        url: function () {
            return Common.getUrl({name: 'starred_files'});
        }
    });

    return StarredFileCollection;
});

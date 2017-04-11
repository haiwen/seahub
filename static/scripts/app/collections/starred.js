define([
    'underscore',
    'backbone',
    'common',
    'app/models/starred-item'
], function(_, Backbone, Common, StarredItem) {
    'use strict';

    var StarredCollection = Backbone.Collection.extend({
        model: StarredItem,
        url: function () {
            return Common.getUrl({name: 'starred_items'});
        }
    });

    return StarredCollection;
});

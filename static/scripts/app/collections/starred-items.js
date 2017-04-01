define([
    'underscore',
    'backbone',
    'common',
    'app/models/starred-item'
], function(_, Backbone, Common, StarredItem) {
    'use strict';

    var StarredItemCollection = Backbone.Collection.extend({
        model: StarredItem,
        url: function () {
            return Common.getUrl({name: 'starred_items'});
        }
    });

    return StarredItemCollection;
});

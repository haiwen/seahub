define([
    'underscore',
    'backbone',
    'app/models/group-change'
], function(_, Backbone, GroupChange) {
    'use strict';

    var GroupChangeCollection = Backbone.Collection.extend({
        model: GroupChange,
        url: app.pageOptions.groupChangesUrl,

        initialize: function() {

        }

    });

    return new GroupChangeCollection();
});

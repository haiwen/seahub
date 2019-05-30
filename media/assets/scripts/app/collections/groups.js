define([
    'underscore',
    'backbone',
    'common',
    'app/models/group'
], function(_, Backbone, Common, Group) {
    'use strict';

    var GroupCollection = Backbone.Collection.extend({
        model: Group,
        comparator: function(a, b) {
            return Common.compareTwoWord(a.get('name'), b.get('name'));
        },

        url: function() {
            return Common.getUrl({name: 'groups'});
        }
    });

    return GroupCollection;
});

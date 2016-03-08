define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var GroupDiscussions = Backbone.Collection.extend({
        setGroupId: function(group_id) {
            this.group_id = group_id;
        },

        url: function() {
            return Common.getUrl({name: 'group_discussions', group_id: this.group_id});
        }
    });

    return GroupDiscussions;
});

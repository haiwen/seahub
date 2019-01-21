define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var GroupMemberCollection = Backbone.Collection.extend({
        setGroupId: function(group_id) {
            this.group_id = group_id;
        },

        url: function() {
            return Common.getUrl({name: 'group_members', group_id: this.group_id});
        }
    });

    return GroupMemberCollection;
});

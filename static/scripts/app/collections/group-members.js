define([
    'underscore',
    'backbone',
    'common',
    'app/models/group-member'
], function(_, Backbone, Common, GroupMember) {
    'use strict';

    var GroupMemberCollection = Backbone.Collection.extend({
        model: GroupMember,
        url: function() {
            return Common.getUrl({name: 'group_members', group_id: this.group_id});
        },

        setGroupID: function(group_id) {
            this.group_id = group_id;
        }
    });

    return GroupMemberCollection;
});

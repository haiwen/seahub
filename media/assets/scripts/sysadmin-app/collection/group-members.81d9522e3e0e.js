define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/group-member'
], function(_, Backbone, Common, GroupMemberModel) {

    'use strict';

    var GroupMemberCollection = Backbone.Collection.extend({

        model: GroupMemberModel,

        setGroupId: function(group_id) {
            this.group_id = group_id;
        },

        parse: function (data) {
            this.group_name= data.group_name;
            return data.members; // return the array
        },

        url: function () {
            return Common.getUrl({name: 'admin-group-members', group_id: this.group_id});
        }
    });

    return GroupMemberCollection;
});

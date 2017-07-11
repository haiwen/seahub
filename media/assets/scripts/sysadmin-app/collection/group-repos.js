define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/group-repo'
], function(_, Backbone, Common, GroupRepoModel) {

    'use strict';

    var GroupRepoCollection = Backbone.Collection.extend({

        model: GroupRepoModel,

        setGroupId: function(group_id) {
            this.group_id = group_id;
        },

        parse: function (data) {
            this.group_name= data.group_name;
            return data.libraries; // return the array
        },

        url: function () {
            return Common.getUrl({name: 'admin-group-libraries', group_id: this.group_id});
        }
    });

    return GroupRepoCollection;
});

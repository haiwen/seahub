define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/group'
], function(_, Backbone, Common, GroupModel) {
    'use strict';

    var GroupCollection = Backbone.Collection.extend({

        model: GroupModel,

        url: function () {
            return Common.getUrl({name: 'admin-groups'});
        },

        parse: function(data) {
            this.search_name = data.name;
            return data.groups;
        }
    });

    return GroupCollection;
});

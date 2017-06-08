define([
    'underscore',
    'backbone',
    'common',
    'app/models/group-discussion'
], function(_, Backbone, Common, GroupDiscussion) {
    'use strict';

    var GroupDiscussions = Backbone.Collection.extend({
        model: GroupDiscussion,

        setGroupId: function(group_id) {
            this.group_id = group_id;
        },

        url: function() {
            return Common.getUrl({name: 'group_discussions', group_id: this.group_id});
        },

        parse: function(data) {
            this.current_page = data.current_page;
            this.page_num = data.page_num;

            return data.msgs;
        }

    });

    return GroupDiscussions;
});

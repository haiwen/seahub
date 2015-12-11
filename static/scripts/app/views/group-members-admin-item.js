define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var GroupMembersAdminItemView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#group-members-admin-item-tmpl').html()),

        initialize: function() {
            this.$avatar_url = this.model.get('avatar_url');
            this.$email = this.model.get('username');
            this.$name = this.model.get('fullname');
        },

        render: function() {
            var obj = {
                avatar_url: this.$avatar_url,
                email: this.$email,
                name: this.$name
            }
            this.$el.html(this.template(obj));
            return this;
        },

        events: {
            'mouseenter': 'showDeleteIcon',
            'mouseleave': 'hideDeleteIcon',
            'click .delete-member': 'deleteMember'
        },

        showDeleteIcon: function() {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        hideDeleteIcon: function() {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        deleteMember: function() {
            // an ajax request which deletes a member
        }

    });

    return GroupMembersAdminItemView;
});

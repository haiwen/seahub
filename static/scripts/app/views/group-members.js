define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-members',
    'app/views/group-member'
], function($, _, Backbone, Common, GroupMembersCollection, GroupMemberView) {
    'use strict';

    var GroupMembersView = Backbone.View.extend({
        tagName: 'div',
        className: 'group-members-popover',

        template: _.template($('#group-members-list-tmpl').html()),

        initialize: function(options) {
            this.render();

            this.$popover = this.$('.popover');
            this.$popoverContent = this.$('.popover-content');
            this.$popoverErrorMsg = this.$('.popover-error-msg');
            this.$popoverHeader = this.$('.popover-header');
            this.$groupMembersList = this.$('.group-members-list');
            this.$loadingTip = this.$('.loading-tip');

            this.members = new GroupMembersCollection();
            this.listenTo(this.members, 'reset', this.reset);

            this.groupView = options.groupView;
            this.group_id = this.groupView.group_id;

            var _this = this;
            $(window).resize(function() {
                var maxHeight = _this.groupMembersMaxHeight();
                var popover = _this.$popover;
                if (popover.length) {
                    _this.$popoverContent.css({'max-height': maxHeight});
                }
            });
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        events: {
            'click .close-members': 'closeMembers'
        },

        reset: function() {
            this.$loadingTip.hide();
            this.members.each(this.addOne, this);
            if (this.$groupMembersList.children('li').length > 1) {
                this.$groupMembersList.children('li:last-child').css('border-bottom', 'none');
            }
            this.$groupMembersList.show();
        },

        addOne: function(member, collection, options) {
            var view = new GroupMemberView({model: member});
            if (options.prepend) {
                this.$groupMembersList.prepend(view.render().el);
            } else {
                this.$groupMembersList.append(view.render().el);
            }
        },

        showGroupMembers: function() {
            var group_id = this.group_id;
            var maxHeight = this.groupMembersMaxHeight();
            this.$popoverContent.css({'max-height': maxHeight});
            this.$loadingTip.show();
            var _this = this;
            var avatar_size = 64;
            this.members.setGroupID(group_id);
            this.members.fetch({
                cache: false, // for IE
                reset: true,
                data: { 'avatar_size': avatar_size },
                success: function(collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                    var $error = _this.$popoverErrorMsg;
                    var err_msgs;
                    if (response.responseText) {
                        err_msgs = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err_msgs = gettext('Please check the network.');
                    }
                    $error.html(err_msgs).show();
                }
            });
        },

        groupMembersMaxHeight: function() {
            var $headerHeight = $('#header').outerHeight(true);
            var $groupTopHeight = $('#group-top').outerHeight(true);
            var $groupMembersHeaderHeight = this.$popoverHeader.outerHeight(true);
            return $(window).height() - $headerHeight - $groupTopHeight - $groupMembersHeaderHeight - 11;
        },

        closeMembers: function() {
            this.$el.remove();
        },

        show: function() {
            this.showGroupMembers();
        }

    });

    return GroupMembersView;
});

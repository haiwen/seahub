define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'select2',
    'app/collections/group-members',
    'app/views/group-members-admin-item'
], function($, _, Backbone, Common, Select2, GroupMembers, GroupMembersAdminItemView) {
    'use strict';

    var GroupMembersAdminView = Backbone.View.extend({
        tagName: 'div',
        id: 'group-members-admin',

        template: _.template($('#group-members-admin-tmpl').html()),

        initialize: function(options) {
            this.members = new GroupMembers();
            this.groupView = options.groupView;

            this.group_id = this.groupView.group_id;
            this.group_name = this.groupView.group_name;
            this.listenTo(this.members, 'reset', this.reset);

            this.render();

            this.$table = this.$('table');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$add_member = this.$('#add-group-member');

            this.$el.modal({
                appendTo: "#main",
                focus: false
            });
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $('[name="email"]', this.$add_member).select2($.extend({
                width: this.$add_member.outerWidth(true) - $('.submit', this.$add_member).outerWidth(true) - 6,
                placeholder: gettext("Search user or enter email")
            }, Common.contactInputOptionsForSelect2()));

            this.showMembers();
        },

        addOne: function(member) {
            var view = new GroupMembersAdminItemView({model: member});
            this.$tableBody.append(view.render().el)
        },
 
        reset: function() {
            this.$loadingTip.hide();
            this.members.each(this.addOne, this);
            this.$table.show();
        },

        showMembers: function() {
            var group_id = this.group_id;
            var _this = this;
            this.$loadingTip.show();
            this.members.setGroupID(group_id);
            this.members.fetch({
                cache: false, // for IE
                reset: true,
                success: function(collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    var err = $('.error', _this.$el);
                    var err_msgs;
                    if (response.responseText) {
                        err_msgs = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err_msgs = gettext('Please check the network.');
                    }
                    _this.$loadingTip.hide();
                    err.html(err_msgs).show();
                }
            });
        },

        render: function() {
            this.$el.html(this.template({group_name: this.group_name}));
            return this;
        },

    });

    return GroupMembersAdminView;
});

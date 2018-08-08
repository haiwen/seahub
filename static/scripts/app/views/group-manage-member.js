define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#group-manage-member-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .role-edit-icon': 'showEdit',
            'change .role-edit': 'editRole',
            'click .rm': 'rmMember'
        },

        initialize: function(options) {
            this.group_id = options.group_id;
            this.is_owner = options.is_owner;
            this.$errorContainer = options.errorContainer;

            this.listenTo(this.model, 'change', this.render);
        },

        render: function() {
            this.$el.html(this.template($.extend(this.model.attributes, {
                is_owner: this.is_owner,
                username: app.pageOptions.username
            })));
            return this;
        },

        highlight: function() {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        showEdit: function() {
            this.$('.cur-role, .role-edit-icon').hide();
            this.$('.role-edit').show();
        },

        editRole: function() {
            var _this = this;

            // '0': member, '1': admin
            var val = this.$('[name="role"]').val();
            var is_admin = val == 1 ? true : false;
            $.ajax({
                url: Common.getUrl({
                    'name': 'group_member',
                    'group_id': this.group_id,
                    'email': encodeURIComponent(this.model.get('email')),
                }),
                type: 'put',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'is_admin': is_admin
                },
                success: function() {
                    _this.model.set({
                        'is_admin': is_admin
                    });
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$errorContainer.html(error_msg).show();
                }
            });
        },

        rmMember: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'group_member',
                    'group_id': this.group_id,
                    'email': encodeURIComponent(this.model.get('email')),
                }),
                type: 'delete',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$errorContainer.html(error_msg).show();
                }
            });
        }

    });

    return View;
});

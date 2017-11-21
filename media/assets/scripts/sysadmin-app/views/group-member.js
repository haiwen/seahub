define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {

    'use strict';

    var GroupMemberView = HLItemView.extend({

        tagName: 'tr',

        template: _.template($('#group-member-item-tmpl').html()),

        events: {
            'click .user-role-edit-icon': 'showEdit',
            'change .user-role-select': 'editRole',
            'click .member-delete-btn': 'deleteGroupMember'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
            this.listenTo(this.model, 'change', this.render);

            var _this = this;
            $(document).on('click', function(e) {
                var target = e.target || event.srcElement;
                if (!_this.$('.user-role-edit-icon, .user-role-select').is(target)) {
                    _this.$('.cur-role, .user-role-edit-icon').show();
                    _this.$('.user-role-select').hide();
                }
            });
        },

        showEdit: function() {
            this.$('.cur-role, .user-role-edit-icon').hide();
            this.$('.user-role-select').show();
        },

        editRole: function() {
            var _this = this;

            // '0': member, '1': admin
            var val = this.$('[name="role"]').val();
            var is_admin = val == 1 ? true : false;
            $.ajax({
                url: Common.getUrl({
                    'name': 'admin-group-member',
                    'group_id': _this.model.get('group_id'),
                    'email': _this.model.get('email')
                }),
                type: 'put',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'is_admin': is_admin
                },
                success: function(data) {
                    _this.model.set({
                        'is_admin': data['is_admin'],
                        'role': data['role']
                    });
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        deleteGroupMember: function() {
            var _this = this;
            var email = this.model.get('email');
            var popupTitle = gettext("Delete Member");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(email) + '">' + Common.HTMLescape(email) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'admin-group-member',
                        'group_id': _this.model.get('group_id'),
                        'email': email
                    }),
                    type: 'DELETE',
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        var msg = gettext("Successfully deleted member {placeholder}").replace('{placeholder}', email);
                        Common.feedback(msg, 'success');
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(popupTitle, popupContent, yesCallback);
            return false;
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    return GroupMemberView;
});

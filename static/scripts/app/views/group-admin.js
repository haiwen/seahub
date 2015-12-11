define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'select2',
    'app/views/group-members-admin'
], function($, _, Backbone, Common, Select2, GroupMembersAdminView) {
    'use strict';

    var GroupAdminView = Backbone.View.extend({
        tagName: 'div',
        className: 'group-admin-popover',

        template: _.template($('#group-admin-tmpl').html()),
        renameTemplate: _.template($('#group-rename-tmpl').html()),
        transferTemplate: _.template($('#group-transfer-tmpl').html()),

        initialize: function(options) {
            this.groupView = options.groupView;
            this.group_id = this.groupView.group_id;
            this.group_name = this.groupView.group_name;
            this.sideNavView = options.sideNavView;

            this.render();
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        events: {
            'click .rename-group': 'renameGroup',
            'click .transfer-group': 'transferGroup',
            'click .dismiss-group': 'dismissGroup',
            'click .change-members': 'changeMembers',
            'click .close-admin': 'closeAdmin'
        },

        renameGroup: function() {
            var form = $(this.renameTemplate({}));
            $('[name="new_name"]', form).attr('placeholder', Common.HTMLescape(this.group_name));
            form.modal({appendTo:'#main', focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.closeAdmin();

            var _this = this;
            form.submit(function() {
                var new_name = $.trim($('[name="new_name"]', form).val());
                if (!new_name) {
                    return false;
                }
                var submit_btn = $('[type="submit"]', form);
                Common.disableButton(submit_btn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_admin',
                        'group_id': _this.group_id
                    }),
                    beforeSend: Common.prepareCSRFToken,
                    type: 'PUT',
                    cache: false,
                    data: {
                        'operation': 'rename',
                        'new_group_name': new_name
                    },
                    success: function() {
                        _this.sideNavView.render();
                        _this.groupView.renderGroupTop(_this.group_id);
                        Common.feedback(gettext("Successfully renamed group to {placeholder}").replace('{placeholder}', Common.HTMLescape(new_name)), 'success');
                        $.modal.close();
                    },
                    error: function(xhr) {
                        var error = $('.error', form);
                        var err_msg;
                        if (xhr.responseText) {
                            err_msg = $.parseJSON(xhr.responseText).error_msg;
                        } else {
                            err_msg = gettext("Please check the network.");
                        }
                        error.html(err_msg).show();
                        Common.enableButton(submit_btn);
                    }
                });
                return false;
            });
            return false;
        },

        transferGroup: function() {
            var form = $(this.transferTemplate({}));
            form.modal({appendTo:'#main', focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.closeAdmin();

            $('[name="email"]', form).select2($.extend({
                width: '297px',
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email"),
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }, Common.contactInputOptionsForSelect2()));

            var _this = this;
            form.submit(function() {
                var email = $.trim($('[name="email"]', form).val());
                if (!email) {
                    return false;
                }
                var submit_btn = $('[type="submit"]', form);
                Common.disableButton(submit_btn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_admin',
                        'group_id': _this.group_id
                    }),
                    beforeSend: Common.prepareCSRFToken,
                    type: 'PUT',
                    cache: false,
                    data: {
                        'operation': 'transfer',
                        'email': email
                    },
                    success: function() {
                        Common.feedback(gettext("Successfully transferred group to {placeholder}").replace('{placeholder}', Common.HTMLescape(email)), 'success');
                        $.modal.close();
                    },
                    error: function(xhr) {
                        var error = $('.error', form);
                        var err_msg;
                        if (xhr.responseText) {
                            err_msg = $.parseJSON(xhr.responseText).error_msg;
                        } else {
                            err_msg = gettext("Please check the network.");
                        }
                        error.html(err_msg).show();
                        Common.enableButton(submit_btn);
                    }
                });
                return false;
            });
            return false;
        },

        dismissGroup: function() {
            var _this = this;
            var dismiss_group = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_admin',
                        'group_id': _this.group_id
                    }),
                    beforeSend: Common.prepareCSRFToken,
                    type: 'DELETE',
                    cache: false,
                    success: function() {
                        Common.feedback(gettext("Successfully dismissed this group"), 'success');
                        $.modal.close();
                        location.href = _this.sideNavView.$el.find('.grp-list a:first').attr('href');
                    },
                    error: function(xhr) {
                        var err_msg;
                        if (xhr.responseText) {
                            err_msg = $.parseJSON(xhr.responseText).error_msg;
                        } else {
                            err_msg = gettext("Please check the network.");
                        }
                        Common.feedback(gettext(err_msg), 'error');
                        $.modal.close();
                    }
                });
            };

            Common.showConfirm(
                gettext("Dismiss group"),
                gettext("Really want to dismiss this group?"),
                dismiss_group
            );
            this.closeAdmin();
            return false;
        },

        changeMembers: function() {
            var groupMembersAdminView = new GroupMembersAdminView({groupView: this.groupView});
            this.closeAdmin();
            return false;
        },

        closeAdmin: function() {
            this.$el.remove();
        }

    });

    return GroupAdminView;
});

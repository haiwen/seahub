define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({

        template: _.template($('#repo-change-password-form-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$('.op-target').css({'max-width':280}); // for long repo name
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});
        },

        render: function() {
            var repo_name = this.repo_name;
            this.$el.html(this.template({
                title: gettext("Change Password of Library {placeholder}")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(repo_name) + '">'
                    + Common.HTMLescape(repo_name) + '</span>')
            }));

            return this;
        },

        events: {
            'submit form': 'formSubmit'
        },

        formSubmit: function() {
            var _this = this;

            var $form = this.$('form'); 
            var $error = this.$('.error'); 
            var old_passwd = $.trim($('input[name="old_passwd"]', $form).val()),
                new_passwd = $.trim($('input[name="new_passwd"]', $form).val()),
                new_passwd_again = $.trim($('input[name="new_passwd_again"]', $form).val());

            if (!old_passwd) {
                $error.html(gettext("Please enter the old password")).removeClass('hide');
                return false;
            }
            if (!new_passwd) {
                $error.html(gettext("Please enter a new password")).removeClass('hide');
                return false;
            }
            if (new_passwd.length < app.pageOptions.repo_password_min_length) {
                $error.html(gettext("New password is too short")).removeClass('hide');
                return false;
            }
            if (!new_passwd_again) {
                $error.html(gettext("Please enter the new password again")).removeClass('hide');
                return false;
            }
            if (new_passwd != new_passwd_again) {
                $error.html(gettext("New passwords don't match")).removeClass('hide');
                return false;
            }

            var $submitBtn = this.$('[type="submit"]');
            Common.disableButton($submitBtn);

            $.ajax({
                url: Common.getUrl({
                    'name': 'api_v2.1_repo_set_password',
                    'repo_id': this.repo_id
                }),
                type: 'PUT',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'old_password': old_passwd,
                    'new_password': new_passwd
                },
                success: function() {
                    $.modal.close();
                    Common.feedback(gettext("Successfully changed library password."), 'success');
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    $error.html(error_msg).show();
                    Common.enableButton($submitBtn);
                }
            });
            return false;
        }

    });

    return View;
});

define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common'
], function($, simplemodal, _, Backbone, Common) {
    'use strict';

    var AddRepoView = Backbone.View.extend({

        tagName: 'div',

        template: _.template($('#create-repo-tmpl').html()),

        initialize: function(repos) {
            this.repos = repos;

            this.render();
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});

            this.listenTo(repos, 'invalid', this.displayValidationErrors);
        },

        render: function() {
            this.$el.html(this.template(this.templateData()));
            return this;
        },

        templateData: function() {
            return {
                showSharePerm: false,
                enable_encrypted_library: app.pageOptions.enable_encrypted_library,
                library_templates: app.pageOptions.library_templates
            };
        },

        events: {
            "submit": "addRepo",
            "click #encrypt-switch": "togglePasswdInput"
        },

        // Generate the attributes for a new GroupRepo item.
        newAttributes: function() {
            var data = {
                name: $.trim($('input[name=repo_name]', this.$el).val()),
                encrypted: $('#encrypt-switch').prop('checked'),
                library_template: $('[name="library_template"]', this.$el).val(),
                storage_id: $('[name="storage"]', this.$el).val()
            };

            if (data.encrypted) {
                $.extend(data, {
                    passwd1: $('input[name=passwd]', this.$el).val(),
                    passwd2: $('input[name=passwd_again]', this.$el).val(),
                    passwd: $('input[name=passwd]', this.$el).val()
                });
            }

            return data;
        },

        // TODO: move to common
        displayValidationErrors: function(model, error, options) {
            this.$('.error').html(error).show();
            Common.enableButton(this.$('[type="submit"]'));
        },

        addRepo: function(e) {
            e.preventDefault();

            Common.disableButton(this.$('[type="submit"]'));
            var repos = this.repos;
            repos.create(this.newAttributes(), {
                wait: true,
                validate: true,
                prepend: true,  // show newly created repo at first line
                success: function() {
                    if (repos.length == 1) {
                        repos.reset(repos.models);
                    }
                },
                error: function(collection, response, options) {
                    var error_msg = Common.prepareAjaxErrorMsg(response);
                    Common.feedback(error_msg, 'error', Common.ERROR_TIMEOUT);
                },
                complete: function() {
                    Common.closeModal();
                }
            });
        },

        togglePasswdInput: function(e) {
            var $checkbox = $('#encrypt-switch');
            var $pwd_input = this.$('input[type="password"]');

            if ($checkbox.prop('checked')) {
                $pwd_input.attr('disabled', false).removeClass('input-disabled');
            } else {
                $pwd_input.attr('disabled', true).addClass('input-disabled');
            }
        }

    });

    return AddRepoView;
});

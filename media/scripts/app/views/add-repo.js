define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
], function($, _, Backbone, Common, Repos) {
    'use strict';

    var AddRepoView = Backbone.View.extend({
        el: '#repo-create-form',

        events: {
            "submit": "addRepo",
            "click #encrypt-switch": "togglePasswdInput"
        },

        initialize: function(repos) {
            this.repos = repos;
            this.listenTo(repos, 'invalid', this.displayValidationErrors);
        },

        render: function() {
            this.$el.modal({appendTo: '#main', autoResize: true});
        },

        // Generate the attributes for a new GroupRepo item.
        newAttributes: function() {
            return {
                name: $('input[name=repo_name]', this.$el).val().trim(),
                desc: $('textarea[name=repo_desc]', this.$el).val().trim(),
                encrypted: $('#encrypt-switch', this.$el).attr('checked'),
                passwd1: $('input[name=passwd]', this.$el).val(),
                passwd2: $('input[name=passwd_again]', this.$el).val(),
                passwd: $('input[name=passwd]', this.$el).val()
            };
        },

        // TODO: move to common
        displayValidationErrors: function(model, error, options) {
            this.$('.error').html(error).show();
            $("#simplemodal-container").css({'height':'auto'});
        },

        addRepo: function(e) {
            e.preventDefault();

            this.repos.create(this.newAttributes(), {
                wait: true,
                validate: true,
                prepend: true,  // show newly created repo at first line
                success: function() {
                    // No need to show feedback
                    // Common.feedback('Success', 'success', Common.SUCCESS_TIMEOUT);
                },
                error: function(xhr, textStatus, errorThrown) {
                    // TODO: handle error gracefully
                    Common.feedback('Error', 'error', Common.ERROR_TIMEOUT);
                },
                complete: function() {
                    Common.closeModal();
                }
            });
        },

        togglePasswdInput: function(e) {
            var pwd_input = $('input[type="password"]', this.$el);

            if ($(e.target).attr('checked')) {
                pwd_input.attr('disabled', false).removeClass('input-disabled');
            } else {
                pwd_input.attr('disabled', true).addClass('input-disabled');
            }
        }

    });

    return AddRepoView;
});

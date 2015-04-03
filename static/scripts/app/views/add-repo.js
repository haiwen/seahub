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
            this.listenTo(repos, 'invalid', this.displayValidationErrors);
        },

        events: {
            "submit": "addRepo",
            "click #encrypt-switch": "togglePasswdInput"
        },

        render: function() {
            this.$el.html(this.template(this.templateData()));
            this.$el.modal();
        },

        templateData: function() {
            return {
                showSharePerm: false
            };
        },

        // Generate the attributes for a new GroupRepo item.
        newAttributes: function() {
            return {
                name: $('input[name=repo_name]', this.$el).val().trim(),
                encrypted: $('#encrypt-switch', this.$el).parent().hasClass('checkbox-checked'),
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
            var $parent = $(e.target).parent();
            $parent.toggleClass('checkbox-checked');

            var pwd_input = $('input[type="password"]', $('.repo-create-encryption'));
            if ($parent.hasClass('checkbox-checked')) {
                pwd_input.attr('disabled', false).removeClass('input-disabled');
            } else {
                pwd_input.attr('disabled', true).addClass('input-disabled');
            }
        }

    });

    return AddRepoView;
});

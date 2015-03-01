define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
    'text!' + app.config._tmplRoot + 'create-repo.html',
], function($, simplemodal, _, Backbone, Common, GroupRepos, CreateRepoTemplate) {
    'use strict';

    var AddGroupRepoView = Backbone.View.extend({

        tagName: 'div',

        template: _.template(CreateRepoTemplate),

        events: {
            "submit": "addGroupRepo"
        },

        initialize: function(repos) {
            this.repos = repos;
        },

        render: function() {
            this.$el.html(this.template({}));
            this.$el.modal();
        },

        // Generate the attributes for a new GroupRepo item.
        newAttributes: function() {
            return {
                name: $('input[name=repo_name]', this.$el).val().trim(),
                desc: $('textarea[name=repo_desc]', this.$el).val().trim(),
                permission: $('select[name=permission]', this.$el).val(),

                // TODO: encrypted repo
                // encrypted: $('#encrypt-switch', this.$el).attr('checked'),
                // passwd1: $('input[name=passwd]', this.$el).val(),
                // passwd2: $('input[name=passwd_again]', this.$el).val()
            };
        },

        addGroupRepo: function(e) {
            e.preventDefault();

            Common.feedback('Loading...', 'info', Common.INFO_TIMEOUT);
            this.repos.create(this.newAttributes(), {
                wait: true,
                prepend: true,  // show newly created repo at first line
                success: function() {
                    Common.feedback('Success', 'success', Common.SUCCESS_TIMEOUT);
                },
                error: function() {
                    Common.feedback('Error', 'error', Common.ERROR_TIMEOUT);
                },
                complete: function() {
                    Common.closeModal();
                }
            });
        }

    });

    return AddGroupRepoView;
});

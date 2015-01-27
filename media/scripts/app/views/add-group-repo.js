define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-repos',
], function($, _, Backbone, Common, GroupRepos) {
    'use strict';

    var AddGroupRepoView = Backbone.View.extend({
        el: '#repo-create-form',

        events: {
            "submit": "addGroupRepo"
        },

        initialize: function() {
            this.render();
        },

        render: function() {
            $('#encrypt-switch').click(function () {
                var pwd_input = $('input[type="password"]', this.$createForm);

                if ($(this).attr('checked')) {
                    pwd_input.attr('disabled', false).removeClass('input-disabled');
                } else {
                    pwd_input.attr('disabled', true).addClass('input-disabled');
                }
            });
            
            this.$el.modal({appendTo: '#main', autoResize: true});
            
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
            GroupRepos.create(this.newAttributes(), {
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

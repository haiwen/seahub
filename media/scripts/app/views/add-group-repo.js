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
                name: 'foo',
                desc: 'bar'
            };
        },

        addGroupRepo: function(e) {
            e.preventDefault();

            Common.feedback('Loading...', 'info', Common.INFO_TIMEOUT);
            GroupRepos.create(this.newAttributes(), {
                wait: true,
                success: function() {

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

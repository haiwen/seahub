define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var RepoShareLinkAdminDialog = Backbone.View.extend({
        tagName: 'div',
        id: 'repo-share-link-admin-dialog',
        template: _.template($('#repo-share-link-admin-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$('.op-target').css({'max-width':280}); // for long repo name
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});
        },

        render: function() {
            this.$el.html(this.template({
                title: gettext("{placeholder} Share Links")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(this.repo_name) + '">'
                    + Common.HTMLescape(this.repo_name) + '</span>')
            }));

            return this;
        },

        events: {

        }

    });

    return RepoShareLinkAdminDialog;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var RepoPermissionsDialog = Backbone.View.extend({
        tagName: 'div',
        id: 'repo-permissions-dialog',
        template: _.template($('#repo-permissions-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$('.op-target').css({'max-width': 280});
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});
        },

        render: function() {
            var repo_name = this.repo_name;
            this.$el.html(this.template({
                title: gettext("{placeholder} Permission Settings")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(repo_name) + '">'
                    + Common.HTMLescape(repo_name) + '</span>'),
            }));

            return this;
        },

        events: {

        }

    });

    return RepoPermissionsDialog;
});

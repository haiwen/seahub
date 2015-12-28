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
            this.$el.modal();
            $("#simplemodal-container").css({'height':'auto'});
        },

        render: function() {
            this.$el.html(this.template({
                title: gettext("{placeholder} Permission Settings")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(this.repo_name) + '">'
                    + Common.HTMLescape(this.repo_name) + '</span>'),
                repo_id: this.repo_id
                // TODO: get settings from server
            }));

            return this;
        },

        events: {

        }

    });

    return RepoPermissionsDialog;
});

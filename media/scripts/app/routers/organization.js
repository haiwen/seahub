/*global define*/
define([
    'jquery',
    'backbone',
    'app/views/organization'
], function($, Backbone, OrganizationView) {
    "use strict";

    var OrganizationRouter = Backbone.Router.extend({
        routes: {
           'lib/:repo_id(/*path)': 'showDir',
            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            this.orgView = new OrganizationView();
        },

        showDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.orgView.showDir(repo_id, path);
        },

        defaultAction: function(){
            this.orgView.showPublicRepos();
        }
    });

    return OrganizationRouter;
});

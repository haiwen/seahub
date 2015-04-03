/*global define*/
define([
    'jquery',
    'backbone',
    'app/collections/group-repos',
    'app/views/group'
], function($, Backbone, Repos, GroupView) {
    "use strict";

    var GroupRouter = Backbone.Router.extend({
        routes: {
            'lib/:repo_id(/*path)': 'showDir',

            'recent-changes': 'showRecentChanges',

            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            this.groupView = new GroupView();
        },

        showDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.groupView.showDir(repo_id, path);
        },

        showRecentChanges: function() {
            console.log('recent changes');
            this.groupView.showChanges();
        },

        defaultAction: function(actions){
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);
            this.groupView.showRepoList();
        }
    });

    return GroupRouter;
});

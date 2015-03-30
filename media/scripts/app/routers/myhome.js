/*global define*/
define([
    'jquery',
    'backbone',
    'app/collections/repos',
    'app/views/myhome'
], function($, Backbone, Repos, MyHomeView) {
    "use strict";

    var MyHomeRouter = Backbone.Router.extend({
        routes: {
            'my-libs': 'showMyRepos',
            'my-libs/lib/:repo_id(/*path)': 'showMyRepoDir',
            'shared-libs': 'showSharedRepos',
            'shared-libs/lib/:repo_id(/*path)': 'showSharedRepoDir',

            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            this.myHomeView = new MyHomeView();
        },

        showMyRepos: function() {
            this.myHomeView.showMyRepos();
        },

        showSharedRepos: function() {
            console.log("show shared repos");
            this.myHomeView.showSharedRepos();
        },

        showMyRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.myHomeView.showDir('my-libs', repo_id, path);
        },

        showSharedRepoDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.myHomeView.showDir('shared-libs', repo_id, path);
        },

        defaultAction: function(actions) {
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);

            this.myHomeView.showMyRepos();
        }
    });

    return MyHomeRouter;
});

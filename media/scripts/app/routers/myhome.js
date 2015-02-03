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
            'lib/:repo_id(/*path)': 'showDir',

            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            this.myHomeView = new MyHomeView();
        },

        showDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            console.log("Repo route has been called.." + "repo_id:" + repo_id + " path:" + path);
            this.myHomeView.showDir(repo_id, path);
        },

        defaultAction: function(actions) {
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);

            this.myHomeView.showRepoList();
        }
    });

    return MyHomeRouter;
});

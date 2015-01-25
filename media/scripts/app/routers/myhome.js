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

        showDir: function(repo_id, path){
            console.log("Repo route has been called.." + "repo_id:" + repo_id + " path:" + path);
            new MyHomeView().showDir(repo_id, path);
        },

        defaultAction: function(actions){
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);

            new MyHomeView().showRepoList();
        }
    });

    return MyHomeRouter;
});

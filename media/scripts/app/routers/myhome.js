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
            'libs/:id(/*path)': 'showDirents',

            // Default
            '*actions': 'defaultAction'
        },

        showDirents: function(id, path){
            console.log("Repo route has been called.." + "id:" + id + " path:" + path);
            new MyHomeView().showDirentList(id, path);
        },

        defaultAction: function(actions){
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);

            new MyHomeView().showRepoList();
        }
    });

    return MyHomeRouter;
});

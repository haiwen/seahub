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
            'libs/:id(/*path)': 'showDirents',

            'recent-changes': 'showRecentChanges',

            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            this.groupView = new GroupView();
        },

        showDirents: function(id, path){
            console.log("Repo route has been called.." + "id:" + id + " path:" + path);
            // new GroupView().showDirentList(id, path);
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

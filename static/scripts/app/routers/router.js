/*global define*/
define([
    'jquery',
    'backbone'
], function($, Backbone) {
    "use strict";

    var MyHomeRouter = Backbone.Router.extend({
        routes: {
            'libs/:id(/*path)': 'showDirents',

            // Default
            '*actions': 'defaultAction'
        },

        showDirents: function(id, path){
            console.log("Repo route has been called.." + "id:" + id + " path:" + path);
            // if (!app.myHomePage) // XXX: is it good ?
            //     app.myHomePage = new app.MyHomePage();

            // app.myHomePage.trigger('showDirents', id, path);
        },

        defaultAction: function(actions){
            // We have no matching route, lets just log what the URL was
            console.log('No route:', actions);
            // app.myHomePage = new app.MyHomePage();
            // app.myHomePage.showRepoList();
        }
        
    });

    return MyHomeRouter;
});

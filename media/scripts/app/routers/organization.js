/*global define*/
define([
    'jquery',
    'backbone',
    'app/views/organization'
], function($, Backbone, OrganizationView) {
    "use strict";

    var OrganizationRouter = Backbone.Router.extend({
        routes: {
           'libs/:id(/*path)': 'showDir',
            // Default
            '*actions': 'defaultAction'
        },

        initialize: function() {
            this.organizationView = new OrganizationView();
        },

        showDir: function() {
            alert('todo');
        },

        defaultAction: function(){
            this.organizationView.showPublicRepos();
        }
    });

    return OrganizationRouter;
});

/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'sysadmin-app/views/side-nav',
    'sysadmin-app/views/dashboard'
], function($, Backbone, Common, SideNavView, DashboardView) {
    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showDashboard',
            'dashboard/': 'showDashboard',
            // Default
            '*actions': 'showDashboard'
        },

        initialize: function() {
            Common.prepareApiCsrf();
            Common.initAccountPopup();

            this.sideNavView = new SideNavView();
            app.ui = {
                sideNavView: this.sideNavView
            };

            this.dashboardView = new DashboardView();
            this.currentView = this.dashboardView;

            $('#info-bar .close').click(Common.closeTopNoticeBar);
        },

        switchCurrentView: function(newView) {
            if (this.currentView != newView) {
                this.currentView.hide();
                this.currentView = newView;
            }
        },

        showDashboard: function() {
            this.switchCurrentView(this.dashboardView);
            this.sideNavView.setCurTab('dashboard');
            this.dashboardView.show();
        }

    });

    return Router;
});

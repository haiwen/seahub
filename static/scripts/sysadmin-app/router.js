/*global define*/
define([
    'jquery',
    'backbone',
    'common',
    'sysadmin-app/views/side-nav',
    'sysadmin-app/views/dashboard',
    'sysadmin-app/views/desktop-devices',
    'sysadmin-app/views/mobile-devices',
    'sysadmin-app/views/device-errors',
    'sysadmin-app/views/repos',
    'sysadmin-app/views/dir',
    'sysadmin-app/views/system-repo',
    'sysadmin-app/views/trash-repos',
    'app/views/account'
], function($, Backbone, Common, SideNavView, DashboardView,
    DesktopDevicesView, MobileDevicesView, DeviceErrorsView,
    ReposView, DirView, SystemReposView,
    TrashReposView, AccountView) {

    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showDashboard',
            'dashboard/': 'showDashboard',
            'desktop-devices/': 'showDesktopDevices',
            'mobile-devices/': 'showMobileDevices',
            'device-errors/': 'showDeviceErrors',
            'libraries/': 'showLibraries',
            'libraries/:repo_id/dirents(/*path)': 'showLibraryDir',
            'libraries/system/': 'showSystemLibrary',
            'libraries/trash/': 'showTrashLibraries',
            // Default
            '*actions': 'showDashboard'
        },

        initialize: function() {
            $('#initial-loading-view').hide();

            Common.prepareApiCsrf();
            Common.initLocale();

            this.sideNavView = new SideNavView();
            app.ui = {
                sideNavView: this.sideNavView
            };

            this.dashboardView = new DashboardView();
            this.desktopDevicesView = new DesktopDevicesView();
            this.mobileDevicesView = new MobileDevicesView();
            this.deviceErrorsView = new DeviceErrorsView();
            this.reposView = new ReposView();
            this.systemReposView = new SystemReposView();
            this.trashReposView = new TrashReposView();
            this.dirView = new DirView();

            app.ui.accountView = this.accountView = new AccountView();

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
        },

        showDesktopDevices: function(current_page) {
            var url = window.location.href;
            var page = url.match(/.*?page=(\d+)/);
            if (page) {
                var current_page = page[1];
            } else {
                var current_page = null;
            }
            this.switchCurrentView(this.desktopDevicesView);
            this.sideNavView.setCurTab('devices');
            this.desktopDevicesView.show({'current_page': current_page});
        },

        showMobileDevices: function(current_page) {
            var url = window.location.href;
            var page = url.match(/.*?page=(\d+)/);
            if (page) {
                current_page = page[1];
            } else {
                current_page = null;
            }
            this.switchCurrentView(this.mobileDevicesView);
            this.sideNavView.setCurTab('devices');
            this.mobileDevicesView.show({'current_page': current_page});
        },

        showDeviceErrors: function() {
            this.switchCurrentView(this.deviceErrorsView);
            this.sideNavView.setCurTab('devices');
            this.deviceErrorsView.show();
        },

        showLibraries: function() {
            var url = window.location.href;
            var page = url.match(/.*?page=(\d+)/);
            if (page) {
                var current_page = page[1];
            } else {
                var current_page = null;
            }
            this.switchCurrentView(this.reposView);
            this.sideNavView.setCurTab('libraries');
            this.reposView.show({'current_page': current_page});
        },

        showLibraryDir: function(repo_id, path) {
            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.dirView);
            this.dirView.show(repo_id, path);
            this.sideNavView.setCurTab('libraries');
        },

        showSystemLibrary: function() {
            this.switchCurrentView(this.systemReposView);
            this.sideNavView.setCurTab('libraries');
            this.systemReposView.show();
        },

        showTrashLibraries: function() {
            this.switchCurrentView(this.trashReposView);
            this.sideNavView.setCurTab('libraries');
            this.trashReposView.show();
        }

    });

    return Router;
});

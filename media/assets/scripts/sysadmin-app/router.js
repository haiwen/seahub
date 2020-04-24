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
    'sysadmin-app/views/search-repos',
    'sysadmin-app/views/system-repo',
    'sysadmin-app/views/trash-repos',
    'sysadmin-app/views/search-trash-repos',
    'sysadmin-app/views/dir',

    'sysadmin-app/views/address-book',
    'sysadmin-app/views/address-book-group',

    'sysadmin-app/views/groups',
    'sysadmin-app/views/search-groups',
    'sysadmin-app/views/group-repos',
    'sysadmin-app/views/group-members',

    'sysadmin-app/views/admin-operation-logs',
    'sysadmin-app/views/admin-login-logs',
    'sysadmin-app/views/device-trusted-ipaddresses',
    'app/views/account'
], function($, Backbone, Common, SideNavView, DashboardView,
    DesktopDevicesView, MobileDevicesView, DeviceErrorsView,
    ReposView, SearchReposView, SystemReposView, TrashReposView,
    SearchTrashReposView, DirView,
    AddressBookView, AddressBookGroupView,
    GroupsView, SearchGroupsView, GroupReposView, GroupMembersView,
    AdminOperationLogsview, AdminLoginLogsView, DeviceTrustedIPView,
    AccountView) {

    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showDashboard',
            'dashboard/': 'showDashboard',
            'desktop-devices/': 'showDesktopDevices',
            'mobile-devices/': 'showMobileDevices',
            'device-errors/': 'showDeviceErrors',
            'device-trusted-ip/': 'showDeviceTrustedIP',

            'all-libs/': 'showLibraries',
            'search-libs/': 'showSearchLibraries',
            'system-lib/': 'showSystemLibrary',
            'trash-libs/': 'showTrashLibraries',
            'search-trash-libs/': 'showSearchTrashLibraries',
            'libs/:repo_id(/*path)': 'showLibraryDir',

            'address-book/': 'showAddressBook',
            'address-book/groups/:group_id/': 'showAddressBookGroup',

            'groups/': 'showGroups',
            'search-groups/': 'showSearchGroups',
            'groups/:group_id/': 'showGroupLibraries',
            'groups/:group_id/libs/': 'showGroupLibraries',
            'groups/:group_id/members/': 'showGroupMembers',

            'admin-operation-logs/': 'showAdminOperationLogs',
            'admin-login-logs/': 'showAdminLoginLogs',
            // Default
            '*actions': 'showDashboard'
        },

        initialize: function() {
            $('#initial-loading').hide()
                .next('.row').removeClass('hide');

            Common.prepareApiCsrf();
            Common.initLocale();

            this.accountView = new AccountView();
            this.sideNavView = new SideNavView();

            this.dashboardView = new DashboardView();
            this.desktopDevicesView = new DesktopDevicesView();
            this.mobileDevicesView = new MobileDevicesView();
            this.deviceErrorsView = new DeviceErrorsView();
            this.deviceTrustedIPView = new DeviceTrustedIPView();

            this.reposView = new ReposView();
            this.searchReposView = new SearchReposView();
            this.systemReposView = new SystemReposView();
            this.trashReposView = new TrashReposView();
            this.searchTrashReposView = new SearchTrashReposView();
            this.dirView = new DirView();

            this.addressBookView = new AddressBookView();
            this.addressBookGroupView = new AddressBookGroupView();

            this.groupsView = new GroupsView();
            this.searchGroupsView = new SearchGroupsView();
            this.groupReposView = new GroupReposView();
            this.groupMembersView = new GroupMembersView();

            this.adminOperationLogsview = new AdminOperationLogsview();
            this.adminLoginLogsView = new AdminLoginLogsView();

            app.ui = {
                sideNavView: this.sideNavView,
                accountView: this.accountView
            };

            this.currentView = this.dashboardView;

            $('#info-bar .close').on('click', Common.closeTopNoticeBar);
        },

        switchCurrentView: function(newView) {
            if (this.currentView != newView) {
                this.currentView.hide();
                this.currentView = newView;
            }
        },

        showDashboard: function() {
            if (!app.pageOptions.admin_permissions.can_view_system_info) {
                return false;
            }

            this.switchCurrentView(this.dashboardView);
            this.sideNavView.setCurTab('dashboard');
            this.dashboardView.show();
        },

        showDesktopDevices: function(current_page) {
            if (!app.pageOptions.is_default_admin) {
                this.showDashboard();
                return false;
            }

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
            if (!app.pageOptions.is_default_admin) {
                this.showDashboard();
                return false;
            }

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
            if (!app.pageOptions.is_default_admin) {
                this.showDashboard();
                return false;
            }

            this.switchCurrentView(this.deviceErrorsView);
            this.sideNavView.setCurTab('devices');
            this.deviceErrorsView.show();
        },

        showDeviceTrustedIP: function() {
            this.switchCurrentView(this.deviceTrustedIPView);
            this.sideNavView.setCurTab('devices');
            this.deviceTrustedIPView.show();
        },

        showLibraries: function() {
            if (!app.pageOptions.admin_permissions.can_manage_library) {
                this.showDashboard();
                return false;
            }

            // url_match: null or an array like ["http://127.0.0.1:8000/sysadmin/#libraries/?page=2", "2"]
            var url_match = location.href.match(/.*?page=(\d+)/);
            var page = url_match ? url_match[1] : 1; // 1: default

            this.switchCurrentView(this.reposView);
            this.sideNavView.setCurTab('libraries', {'option': 'all'});
            this.reposView.show({'page': page});
        },

        showSearchLibraries: function() {
            if (!app.pageOptions.admin_permissions.can_manage_library) {
                this.showDashboard();
                return false;
            }

            // url_match: null or an array
            var url_match = location.href.match(/.*?name=(.*)&owner=(.*)/); // search by repo_name/owner
            var repo_name = url_match ? url_match[1] : '';
            var owner = url_match ? url_match[2] : '';

            this.switchCurrentView(this.searchReposView);
            this.sideNavView.setCurTab('libraries', {'option': 'search'});
            this.searchReposView.show({
                'name': decodeURIComponent(repo_name),
                'owner': decodeURIComponent(owner)
            });
        },

        showLibraryDir: function(repo_id, path) {
            if (!app.pageOptions.admin_permissions.can_manage_library) {
                this.showDashboard();
                return false;
            }

            if (path) {
                path = '/' + path;
            } else {
                path = '/';
            }
            this.switchCurrentView(this.dirView);
            this.dirView.show(repo_id, path);
            this.sideNavView.setCurTab('libraries', {'option': ''});
        },

        showSystemLibrary: function() {
            if (!app.pageOptions.admin_permissions.can_manage_library) {
                this.showDashboard();
                return false;
            }

            this.switchCurrentView(this.systemReposView);
            this.sideNavView.setCurTab('libraries', {'option': 'system'});
            this.systemReposView.show();
        },

        // show trash libs by page
        showTrashLibraries: function() {
            if (!app.pageOptions.admin_permissions.can_manage_library) {
                this.showDashboard();
                return false;
            }

            // url_match: null or an array
            var url_match = location.href.match(/.*?page=(\d+)/);
            var page = url_match ? url_match[1] : 1; // 1: default

            this.switchCurrentView(this.trashReposView);
            this.sideNavView.setCurTab('libraries', {'option': 'trash'});
            this.trashReposView.show({'page': page});
        },

        // search trash libs by owner
        showSearchTrashLibraries: function() {
            if (!app.pageOptions.admin_permissions.can_manage_library) {
                this.showDashboard();
                return false;
            }

            // url_match: null or an array
            var url_match = location.href.match(/.*?name=(.*)/); // search by owner
            var owner = url_match ? url_match[1] : '';

            this.switchCurrentView(this.searchTrashReposView);
            this.sideNavView.setCurTab('libraries', {'option': 'trash'});
            this.searchTrashReposView.show({'owner': decodeURIComponent(owner)});
        },

        showGroups: function() {
            if (!app.pageOptions.admin_permissions.can_manage_group) {
                this.showDashboard();
                return false;
            }

            // url_match: null or an array like ["http://127.0.0.1:8000/sysadmin/#groups/?page=2", "2"]
            var url_match = location.href.match(/.*?page=(\d+)/);
            var page = url_match ? url_match[1] : 1; // 1: default

            this.switchCurrentView(this.groupsView);
            this.sideNavView.setCurTab('groups');
            this.groupsView.show({'page': page});
        },

        showSearchGroups: function() {
            if (!app.pageOptions.admin_permissions.can_manage_group) {
                this.showDashboard();
                return false;
            }

            // url_match: null or an array
            var url_match = location.href.match(/.*?name=(.*)/); // search by group_name
            var group_name = url_match ? url_match[1] : '';

            this.switchCurrentView(this.searchGroupsView);
            this.sideNavView.setCurTab('groups', {'option': 'search'});
            this.searchGroupsView.show({
                'name': decodeURIComponent(group_name)
            });
        },

        showGroupLibraries: function(group_id) {
            if (!app.pageOptions.admin_permissions.can_manage_group) {
                this.showDashboard();
                return false;
            }

            this.switchCurrentView(this.groupReposView);
            this.sideNavView.setCurTab('groups');
            this.groupReposView.show(group_id);
        },

        showGroupMembers: function(group_id) {
            if (!app.pageOptions.admin_permissions.can_manage_group) {
                this.showDashboard();
                return false;
            }

            this.switchCurrentView(this.groupMembersView);
            this.sideNavView.setCurTab('groups');
            this.groupMembersView.show(group_id);
        },

        showAddressBook: function() {
            if (!app.pageOptions.is_pro ||
                !app.pageOptions.admin_permissions.can_manage_group) {
                this.showDashboard();
                return false;
            }

            this.switchCurrentView(this.addressBookView);
            this.sideNavView.setCurTab('address-book');
            this.addressBookView.show();
        },

        showAddressBookGroup: function(group_id) {
            if (!app.pageOptions.is_pro ||
                !app.pageOptions.admin_permissions.can_manage_group) {
                this.showDashboard();
                return false;
            }

            this.switchCurrentView(this.addressBookGroupView);
            this.sideNavView.setCurTab('address-book');
            this.addressBookGroupView.show({'group_id': group_id});
        },

        showAdminOperationLogs: function() {
            if (!app.pageOptions.admin_permissions.can_view_admin_log) {
                this.showDashboard();
                return false;
            }

            var url = window.location.href;
            var page = url.match(/.*?page=(\d+)/);
            if (page) {
                var current_page = page[1];
            } else {
                var current_page = null;
            }

            this.switchCurrentView(this.adminOperationLogsview);
            this.sideNavView.setCurTab('admin-logs');
            this.adminOperationLogsview.show({'current_page': current_page});
        },

        showAdminLoginLogs: function() {
            var url = window.location.href;
            var page = url.match(/.*?page=(\d+)/);
            if (page) {
                var current_page = page[1];
            } else {
                var current_page = null;
            }

            this.switchCurrentView(this.adminLoginLogsView);
            this.sideNavView.setCurTab('admin-logs');
            this.adminLoginLogsView.show({'current_page': current_page});
        }

    });

    return Router;
});

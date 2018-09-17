/*global define*/
define([
    'jquery',
    'backbone',
    'common',

    'orgadmin-app/views/side-nav',

    'sysadmin-app/views/address-book',
    'sysadmin-app/views/address-book-group',

    'app/views/account'
], function($, Backbone, Common, SideNavView,
    AddressBookView, AddressBookGroupView,
    AccountView) {

    "use strict";

    var Router = Backbone.Router.extend({
        routes: {
            '': 'showAddressBook',

            'address-book/': 'showAddressBook',
            'address-book/groups/:group_id/': 'showAddressBookGroup',

            // Default
            '*actions': 'showAddressBook',
        },

        initialize: function() {
            $('#initial-loading').hide()
                .next('.row').removeClass('hide');

            Common.prepareApiCsrf();
            Common.initLocale();

            this.accountView = new AccountView();
            this.sideNavView = new SideNavView();
            app.ui = {
                sideNavView: this.sideNavView,
                accountView: this.accountView
            };

            $('#info-bar .close').on('click', Common.closeTopNoticeBar);

            this.addressBookView = new AddressBookView();
            this.addressBookGroupView = new AddressBookGroupView();
        },

        switchCurrentView: function(newView) {
            if (!this.currentView) {
                this.currentView = newView;
            } else {
                if (this.currentView != newView) {
                    this.currentView.hide();
                    this.currentView = newView;
                }
            }
        },

        showAddressBook: function() {
            this.switchCurrentView(this.addressBookView);
            this.sideNavView.setCurTab('address-book');
            this.addressBookView.show();
        },

        showAddressBookGroup: function(group_id) {
            this.switchCurrentView(this.addressBookGroupView);
            this.sideNavView.setCurTab('address-book');
            this.addressBookGroupView.show({'group_id': group_id});
        }

    });

    return Router;
});

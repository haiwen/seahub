define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/admin-login-log',
    'sysadmin-app/collection/admin-login-logs'
], function($, _, Backbone, Common, AdminLoginLogView, AdminLoginLogCollection) {
    'use strict';

    var AdminLoginsView = Backbone.View.extend({

        id: 'admin-login-logs',

        template: _.template($("#admin-login-logs-tmpl").html()),

        initialize: function() {
            this.adminLoginLogCollection = new AdminLoginLogCollection();
            this.listenTo(this.adminLoginLogCollection, 'add', this.addOne);
            this.listenTo(this.adminLoginLogCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.html(this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
        },

        events: {
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        getNextPage: function() {
            this.initPage();
            this.adminLoginLogCollection.getNextPage({reset: true});
            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            this.adminLoginLogCollection.getPreviousPage({reset: true});
            return false;
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$emptyTip.hide();

            this.$jsNext.hide();
            this.$jsPrevious.hide();
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(option) {
            this.option = option;
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent();
        },

        renderPaginator: function() {
            if (this.adminLoginLogCollection.hasNextPage()) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            if (this.adminLoginLogCollection.hasPreviousPage()) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        getContent: function() {
            this.initPage();

            var _this = this;
            var current_page = parseInt(this.option.current_page) || 1;
            var first_page = parseInt(this.adminLoginLogCollection.state.firstPage);
            var total_page = parseInt(this.adminLoginLogCollection.state.totalPages);

            // `currentPage` must be firstPage <= currentPage <= totalPages if 1-based.
            if (first_page <= current_page && current_page <= total_page) {
                this.adminLoginLogCollection.getPage(current_page).done(function () {
                    _this.$loadingTip.hide();
                    var current_page = _this.adminLoginLogCollection.state.currentPage;
                    app.router.navigate('admin-login-logs/?page=' + current_page);

                    if (_this.adminLoginLogCollection.length > 0) {
                        _this.$table.show();
                    } else {
                        _this.$emptyTip.show();
                    }

                    _this.renderPaginator();
                });
            } else {
                // always get the first page if not use `getPage` method
                _this.adminLoginLogCollection.state.currentPage = 1;
                this.adminLoginLogCollection.fetch({
                    cache: false,
                    reset: true,
                    error: function(collection, response, opts) {
                        var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                        Common.feedback(err_msg, 'error');
                    },
                    complete: function() {
                        _this.$loadingTip.hide();
                    }
                });
            }
        },

        addOne: function(login) {
            var view = new AdminLoginLogView({model: login});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$loadingTip.hide();

            var current_page = this.adminLoginLogCollection.state.currentPage;
            app.router.navigate('admin-login-logs/?page=' + current_page);

            if (this.adminLoginLogCollection.length > 0) {
                this.adminLoginLogCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }

            this.renderPaginator();
        }
    });
    return AdminLoginsView;
});

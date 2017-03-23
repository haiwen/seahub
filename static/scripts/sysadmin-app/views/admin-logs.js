define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/admin-log',
    'sysadmin-app/collection/admin-logs'
], function($, _, Backbone, Common, AdminLogView, AdminLogCollection) {
    'use strict';

    var AdminLogsView = Backbone.View.extend({

        id: 'admin-logs',

        template: _.template($("#admin-logs-tmpl").html()),

        initialize: function() {
            this.adminLogCollection = new AdminLogCollection();
            this.listenTo(this.adminLogCollection, 'add', this.addOne);
            this.listenTo(this.adminLogCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.append(this.template());

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
            this.adminLogCollection.getNextPage({reset: true});
            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            this.adminLogCollection.getPreviousPage({reset: true});
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
            if (this.adminLogCollection.hasNextPage()) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            if (this.adminLogCollection.hasPreviousPage()) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        getContent: function() {
            this.initPage();

            var _this = this;
            var current_page = parseInt(this.option.current_page) || 1;
            var first_page = parseInt(this.adminLogCollection.state.firstPage);
            var total_page = parseInt(this.adminLogCollection.state.totalPages);

            // `currentPage` must be firstPage <= currentPage <= totalPages if 1-based.
            if (first_page <= current_page && current_page <= total_page) {
                this.adminLogCollection.getPage(current_page).done(function () {
                    _this.$loadingTip.hide();
                    var current_page = _this.adminLogCollection.state.currentPage;
                    app.router.navigate('admin-logs/?page=' + current_page);

                    if (_this.adminLogCollection.length > 0) {
                        _this.$table.show();
                    } else {
                        _this.$emptyTip.show();
                    }

                    _this.renderPaginator();
                });
            } else {
                // always get the first page if not use `getPage` method
                _this.adminLogCollection.state.currentPage = 1;
                this.adminLogCollection.fetch({
                    cache: false,
                    reset: true,
                    error: function(collection, response, opts) {
                        var err_msg;
                        if (response.responseText) {
                            if (response['status'] == 401 || response['status'] == 403) {
                                err_msg = gettext("Permission error");
                            } else {
                                err_msg = $.parseJSON(response.responseText).error_msg;
                            }
                        } else {
                            err_msg = gettext("Failed. Please check the network.");
                        }
                        Common.feedback(err_msg, 'error');
                    },
                    complete: function() {
                        _this.$loadingTip.hide();
                    }
                });
            }
        },

        addOne: function(log) {
            var view = new AdminLogView({model: log});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$loadingTip.hide();

            var current_page = this.adminLogCollection.state.currentPage;
            app.router.navigate('admin-logs/?page=' + current_page);

            if (this.adminLogCollection.length > 0) {
                this.adminLogCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }

            this.renderPaginator();
        }
    });
    return AdminLogsView;
});

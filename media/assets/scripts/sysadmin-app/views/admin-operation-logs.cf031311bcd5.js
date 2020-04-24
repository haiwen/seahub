define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/admin-operation-log',
    'sysadmin-app/collection/admin-operation-logs'
], function($, _, Backbone, Common, AdminOperationLogView, AdminOperationLogCollection) {
    'use strict';

    var AdminOperationLogsView = Backbone.View.extend({

        id: 'admin-logs',

        template: _.template($("#admin-operation-logs-tmpl").html()),

        initialize: function() {
            this.adminOperationLogCollection = new AdminOperationLogCollection();
            this.listenTo(this.adminOperationLogCollection, 'add', this.addOne);
            this.listenTo(this.adminOperationLogCollection, 'reset', this.reset);
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
            this.adminOperationLogCollection.getNextPage({reset: true});
            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            this.adminOperationLogCollection.getPreviousPage({reset: true});
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
            if (this.adminOperationLogCollection.hasNextPage()) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            if (this.adminOperationLogCollection.hasPreviousPage()) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        getContent: function() {
            this.initPage();

            var _this = this;
            var current_page = parseInt(this.option.current_page) || 1;
            var first_page = parseInt(this.adminOperationLogCollection.state.firstPage);
            var total_page = parseInt(this.adminOperationLogCollection.state.totalPages);

            // `currentPage` must be firstPage <= currentPage <= totalPages if 1-based.
            if (first_page <= current_page && current_page <= total_page) {
                this.adminOperationLogCollection.getPage(current_page).done(function () {
                    _this.$loadingTip.hide();
                    var current_page = _this.adminOperationLogCollection.state.currentPage;
                    app.router.navigate('admin-operation-logs/?page=' + current_page);

                    if (_this.adminOperationLogCollection.length > 0) {
                        _this.$table.show();
                    } else {
                        _this.$emptyTip.show();
                    }

                    _this.renderPaginator();
                });
            } else {
                // always get the first page if not use `getPage` method
                _this.adminOperationLogCollection.state.currentPage = 1;
                this.adminOperationLogCollection.fetch({
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

        addOne: function(log) {
            var view = new AdminOperationLogView({model: log});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$loadingTip.hide();

            var current_page = this.adminOperationLogCollection.state.currentPage;
            app.router.navigate('admin-operation-logs/?page=' + current_page);

            if (this.adminOperationLogCollection.length > 0) {
                this.adminOperationLogCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }

            this.renderPaginator();
        }
    });
    return AdminOperationLogsView;
});

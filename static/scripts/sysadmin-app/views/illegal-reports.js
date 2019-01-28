define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/illegal-report',
    'sysadmin-app/collection/illegal-reports'
], function($, _, Backbone, Common, IllegalReportView, IllegalReportsCollection) {
    'use strict';

    var IllegalReportsView = Backbone.View.extend({

        id: 'admin-illegal-reports',

        template: _.template($("#illegal-reports-tmpl").html()),

        initialize: function() {
            this.illegalReportsCollection = new IllegalReportsCollection();
            this.listenTo(this.illegalReportsCollection, 'add', this.addOne);
            this.listenTo(this.illegalReportsCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.html(this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$error = this.$('.error');
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$emptyTip.hide();
            this.$error.hide();
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent();
        },

        getContent: function() {
            this.initPage();
            var _this = this;

            this.illegalReportsCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                }
            })
        },

        addOne: function(report) {
            var view = new IllegalReportView({model: report});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.initPage();

            this.$loadingTip.hide();
            if (this.illegalReportsCollection.length > 0) {
                this.illegalReportsCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        }
    });
    return IllegalReportsView;
});

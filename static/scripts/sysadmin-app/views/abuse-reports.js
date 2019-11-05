define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/abuse-report',
    'sysadmin-app/collection/abuse-reports'
], function($, _, Backbone, Common, AbuseReportView, AbuseReportsCollection) {
    'use strict';

    var AbuseReportsView = Backbone.View.extend({

        id: 'admin-abuse-reports',

        template: _.template($("#abuse-reports-tmpl").html()),

        initialize: function() {
            this.abuseReportsCollection = new AbuseReportsCollection();
            this.listenTo(this.abuseReportsCollection, 'add', this.addOne);
            this.listenTo(this.abuseReportsCollection, 'reset', this.reset);
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

            this.abuseReportsCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                }
            })
        },

        addOne: function(report) {
            var view = new AbuseReportView({model: report});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.initPage();

            this.$loadingTip.hide();
            if (this.abuseReportsCollection.length > 0) {
                this.abuseReportsCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        }
    });
    return AbuseReportsView;
});

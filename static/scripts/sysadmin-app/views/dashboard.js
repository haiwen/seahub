define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/sysinfo'
], function($, _, Backbone, Common, SysInfo) {
    'use strict';

    var DashboardView = Backbone.View.extend({

        id: "admin-dashboard",

        template: _.template($("#sysinfo-tmpl").html()),
        headerTemplate: _.template($("#sysinfo-header-tmpl").html()),

        initialize: function() {
            this.sysinfo = new SysInfo();
            this.render();
        },

        render: function() {
            this.$el.html(this.headerTemplate());
            this.$loadingTip = this.$('.loading-tip');
            this.$sysinfo = this.$('.sysinfo');
        },

        showSysinfo: function() {
            this.$sysinfo.empty();
            this.$loadingTip.show();
            var _this = this;
            this.sysinfo.fetch({
                cache: false, // for IE
                success: function(model, response, options) {
                    _this.reset();
                },
                error: function(model, response, options) {
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
                }
            });
        },

        hide: function() {
            this.$el.detach();
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showSysinfo();
        },

        reset: function() {
            this.$loadingTip.hide();
            this.$sysinfo.html(this.template(this.sysinfo.toJSON()));
        }

    });

    return DashboardView;
});

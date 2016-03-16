define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/SysInfo'
], function($, _, Backbone, Common, SysInfo) {
    'use strict';

    var DashboardView = Backbone.View.extend({

        tagName: 'div',
        template: _.template($("#sysinfo-tmpl").html()),

        initialize: function() {
            this.sysinfo = new SysInfo();
        },

        events: {
        },

        render: function() {
            var _this = this;
            this.sysinfo.fetch({
                success: function(model, response, options) {
                    _this._showContent();
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

        },

        show: function() {
            this.render();
        },


        _showContent: function() {
            console.log(this.sysinfo.toJSON());
            this.$el.html(this.template(this.sysinfo.toJSON()));
            $("#right-panel").html(this.$el);
            return this;
        }

    });

    return DashboardView;
});

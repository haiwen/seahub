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
        conTemplate: _.template($("#sysinfo-con-tmpl").html()),

        initialize: function() {
            this.sysinfo = new SysInfo();
            this.render();
        },

        events: {
            'click .license-file-upload-btn': 'uploadFile',
            'change .license-file-upload-input': 'uploadLicenseFile'
        },

        uploadFile: function() {
            this.$('.license-file-upload-input').trigger('click');
        },

        uploadLicenseFile: function() {
            var $input = this.$('.license-file-upload-input');
            var file;
            if ($input[0].files) {
                file = $input[0].files[0];
            } else {
                return;
            }

            var input_name = $input.attr('name');
            var fd = new FormData();

            fd.append(input_name, file);
            $.ajax({
                url: Common.getUrl({'name': 'license'}),
                type: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                beforeSend: Common.prepareCSRFToken,
                success: function(){
                    location.reload(true);
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        },

        render: function() {
            this.$el.html(this.template());
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
                            err_msg = Common.HTMLescape(JSON.parse(response.responseText).error_msg);
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
            var json_data = this.sysinfo.toJSON();
            json_data['formatted_storage'] = Common.quotaSizeFormat(json_data['total_storage'], 1)
            this.$sysinfo.html(this.conTemplate(json_data));
        }

    });

    return DashboardView;
});

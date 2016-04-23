define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/device-error',
    'sysadmin-app/collection/device-errors'
], function($, _, Backbone, Common, DeviceError, DeviceErrorsCollection) {
    'use strict';

    var DeviceErrorsView = Backbone.View.extend({

        id: 'admin-device-errors',

        template: _.template($("#admin-device-errors-tmpl").html()),

        initialize: function() {
            this.deviceErrorsCollection = new DeviceErrorsCollection();
            this.listenTo(this.deviceErrorsCollection, 'add', this.addOne);
            this.listenTo(this.deviceErrorsCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.html(this.template({'cur_tab': 'errors'}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        hide: function() {
            this.$el.detach();
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showAdminDeviceError();
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        showAdminDeviceError: function() {
            this.initPage();

            var _this = this;
            this.deviceErrorsCollection.fetch({
                cache: false, // for IE
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function (collection, response, opts) {
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

        reset: function() {
            this.$loadingTip.hide();
            if (this.deviceErrorsCollection.length) {
                this.deviceErrorsCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(deviceError) {
            var view = new DeviceError({model: deviceError});
            this.$tableBody.append(view.render().el);
        }

    });
    return DeviceErrorsView;
});

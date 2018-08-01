define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/device-error',
    'sysadmin-app/collection/device-errors'
], function($, _, Backbone, Common, DeviceError, DeviceErrorCollection) {
    'use strict';

    var DeviceErrorsView = Backbone.View.extend({

        id: 'admin-device-errors',

        template: _.template($("#device-errors-tmpl").html()),

        initialize: function() {
            this.deviceErrorCollection = new DeviceErrorCollection();
            this.listenTo(this.deviceErrorCollection, 'add', this.addOne);
            this.listenTo(this.deviceErrorCollection, 'reset', this.reset);
            this.render();
        },

        events: {
            'click #clean-device-errors': 'cleanDeviceErrors'
        },

        cleanDeviceErrors: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({name: 'admin-device-errors'}),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.$table.hide();
                    _this.$cleanBtn.hide();
                    _this.$emptyTip.show();
                    _this.deviceErrorCollection.reset();
                    var msg = gettext("Successfully clean all errors.");
                    Common.feedback(msg, 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        render: function() {
            this.$el.html(this.template({'cur_tab': 'errors'}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$cleanBtn = this.$('#clean-device-errors');
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
            this.deviceErrorCollection.fetch({
                cache: false, // for IE
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function (collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            this.$loadingTip.hide();
            if (this.deviceErrorCollection.length) {
                this.deviceErrorCollection.each(this.addOne, this);
                this.$table.show();
                this.$cleanBtn.show();
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

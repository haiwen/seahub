define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/device-trusted-ipaddress',
    'sysadmin-app/collection/device-trusted-ip'
],function($, _, Backbone, Common, DeviceTrustedIP, DeviceTrustedIPAddressCollection) {
    'use strict';

    var DeviceTrustedIPView = Backbone.View.extend({

        id: 'admin-device-trusted-ip',

        template: _.template($('#device-trusted-ip-tmpl').html()),
        ipAddFormtemplate: _.template($("#add-trusted-ip-form-tmpl").html()),

        initialize: function() {
            this.deviceTrustedIPAddressCollection = new DeviceTrustedIPAddressCollection();
            this.listenTo(this.deviceTrustedIPAddressCollection, 'add', this.addOne);
            this.listenTo(this.deviceTrustedIPAddressCollection, 'reset', this.reset);
            this.render();
        },

        events: {
            'click #add-trusted-ip-btn': 'showAddTrustedIpForm',
            'mouseover tbody tr': 'mouseovercard',
            'mouseout tbody tr': 'mouseoutcard',
        },

        mouseoutcard: function(e) {
            $(e.target).parent().find("#remove-trusted-ip").addClass('vh');
        },

        mouseovercard: function(e) {
            $(e.target).parent().find("#remove-trusted-ip").removeClass('vh');
        },

        showAddTrustedIpForm: function() {
            var $form = $(this.ipAddFormtemplate()),
                $submitBtn = $("add-ip-form-btn"),
                _this = this;

            $form.modal()
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.submit(function(){
                var ipaddress = $.trim($('#ipaddress', $form).val());
                var $error = $('.error', $form);
                if (!ipaddress) {
                    $error.html(gettext("IP is required.")).show()
                    return False;
                }
                $error.hide()
                Common.disableButton($submitBtn);

                _this.deviceTrustedIPAddressCollection.create({'ipaddress': ipaddress},{
                    prepend: true,
                    wait: true,
                    success: function() {
                        if (DeviceTrustedIPAddressCollection.length == 1) {
                            DeviceTrustedIPAddressCollection.reset(DeviceTrustedIPAddressCollection.models);
                        }
                        Common.closeModal();
                    },
                    error: function(collection, response, options) {
                        var err_msg;
                        if (response.responseText) {
                            if (response['status'] == 401 || response['status'] == 403) {
                                err_msg = gettext("Permission error");
                            } else {
                                err_msg = $.parseJSON(response.responseText).error_msg;
                            }
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        $error.html(err_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
            return false;
        },

        render: function() {
            this.$el.html(this.template({'cur_tab': 'settings', 'is_pro': app.pageOptions.is_pro}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$error = this.$('.error');
            $("tbody tr:gt(0)").hover(this.mouseovercard, this.mouseoutcard);
        },

        hide: function() {
            this.$el.detach();
        },

        show: function() {
            $("#right-panel").html(this.$el);
            this.showAdminDeviceTrustedIP();
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$error.hide();
        },

        showAdminDeviceTrustedIP: function() {
            this.initPage();

            var _this = this;
            this.deviceTrustedIPAddressCollection.fetch({
                cache: false,
                reset: true,
                success: function(collection, response, opts){
                },
                error: function(collection, response, opts){
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
            if (this.deviceTrustedIPAddressCollection.length > 0) {
                this.deviceTrustedIPAddressCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(ip, collection, options) {
            var view = new DeviceTrustedIP({model: ip});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        }
    });

    return DeviceTrustedIPView;
});

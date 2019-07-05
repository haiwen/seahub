define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/device-trusted-ipaddress',
    'sysadmin-app/collection/device-trusted-ipaddresses'
],function($, _, Backbone, Common, DeviceTrustedIPAddressView, DeviceTrustedIPAddressCollection) {
    'use strict';

    var DeviceTrustedIPView = Backbone.View.extend({

        id: 'admin-device-trusted-ip',

        template: _.template($('#device-trusted-ipaddresses-tmpl').html()),
        ipAddFormtemplate: _.template($("#add-trusted-ipaddress-form-tmpl").html()),

        initialize: function() {
            this.deviceTrustedIPAddressCollection = new DeviceTrustedIPAddressCollection();
            this.listenTo(this.deviceTrustedIPAddressCollection, 'add', this.addOne);
            this.listenTo(this.deviceTrustedIPAddressCollection, 'reset', this.reset);
            this.render();
        },

        events: {
            'click #add-trusted-ip-btn': 'showAddTrustedIpForm'
        },

        showAddTrustedIpForm: function() {
            var $form = $(this.ipAddFormtemplate()),
                _this = this,
                trustedIP = this.deviceTrustedIPAddressCollection;

            $form.modal()
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            $form.on('submit', function(){
                var $submitBtn = $('add-ip-form-btn', $form);
                var ipaddress = $.trim($('#ipaddress', $form).val());
                var $error = $('.error', $form);
                if (!ipaddress) {
                    $error.html(gettext("It is required.")).show();
                    return False;
                }
                $error.hide();
                Common.disableButton($submitBtn);

                trustedIP.create({'ipaddress': ipaddress},{
                    prepend: true,
                    wait: true,
                    success: function() {
                        if (trustedIP.length == 1) {
                            trustedIP.reset(trustedIP.models);
                        }
                        Common.closeModal();
                    },
                    error: function(collection, response, options) {
                        var error_msg = Common.prepareAjaxErrorMsg(response);
                        $error.html(error_msg).show();
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
            this.showAdminDeviceTrustedIP();
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$error.hide();
            this.$emptyTip.hide();
        },

        showAdminDeviceTrustedIP: function() {
            this.initPage();

            var _this = this;
            this.deviceTrustedIPAddressCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts){
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            this.initPage();
            this.$loadingTip.hide();

            if (this.deviceTrustedIPAddressCollection.length > 0) {
                this.deviceTrustedIPAddressCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(ip, collection, options) {
            var view = new DeviceTrustedIPAddressView({model: ip});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        }
    });

    return DeviceTrustedIPView;
});

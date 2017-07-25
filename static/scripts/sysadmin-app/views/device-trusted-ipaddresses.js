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

        initialize: function() {
            this.deviceTrustedIPAddressCollection = new DeviceTrustedIPAddressCollection();
            this.listenTo(this.deviceTrustedIPAddressCollection, 'add', this.addOne);
            this.listenTo(this.deviceTrustedIPAddressCollection, 'reset', this.reset);
            this.render();
        },

        events: {
            'click #add-trusted-ip-btn': 'showAddTrustedIpForm',
            'click #remove-trusted-ip': 'removeOne',
            'mouseover tbody tr': 'mouseovercard',
            'mouseout tbody tr': 'mouseoutcard',
        },

        mouseoutcard: function(e) {
            $(e.target).parent().find("#remove-trusted-ip").addClass('vh');
        },

        mouseovercard: function(e) {
            $(e.target).parent().find("#remove-trusted-ip").removeClass('vh');
        },

        removeOne: function(e) {
            $.ajax({
                url: Common.getUrl({name: 'admin-device-trusted-ip'}) + "?ipaddress="+$(e.target).parent().parent().find(":first").html(),
                type: "DELETE",
                cache: false,
                dataType: "JSON",
                beforeSend: Common.prepareCSRFToken,
                success: function(data){
                    $(e.target).parent().parent().remove();
                },
                error: function(xhr ){
                    Common.feedback('system error', 'error');
                }
            })
        },

        createOne: function() {
            $.ajax({
                url: Common.getUrl({name: 'admin-device-trusted-ip'}),
                type: "POST",
                cache: false,
                dataType: "JSON",
                beforeSend: Common.prepareCSRFToken,
                data: {
                    "ipaddress": $("#ipaddress").val()
                },
                success: function(data, textStatus, xhr){
                    if (xhr.status == 201){
                        $("#admin-device-trusted-ip tbody").append('<tr><td id="label-id">' 
                                + data.ip + 
                                '</td><td><a id="remove-trusted-ip" style="cursor:pointer;" class="op vh">Remove</a></td></tr>')
                        $.modal.close();
                    }
                    else if (xhr.status == 200){
                        var parsed_resp = $.parseJSON(xhr.responseText);
                        $("#add-trusted-ip-form .error").html('ip address already exists').show();
                    }
                },
                error: function(xhr, textStatus, errorThrown){
                    if (xhr.responseText) {
                        var parsed_resp = $.parseJSON(xhr.responseText);
                        $("#add-trusted-ip-form .error").html(parsed_resp.error_msg).show();
                    } else {
                        $("#add-trusted-ip-form .error").html("Failed. Please check the network").show();
                    }
                }
            })
        },

        showAddTrustedIpForm: function() {
            $('#add-trusted-ip-form').modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
        },

        render: function() {
            this.$el.html(this.template({'cur_tab': 'settings', 'is_pro': app.pageOptions.is_pro, 'ENABLE_LIMIT_IPADDRESS': app.pageOptions.enable_limit_ipaddress}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            $("body").on('click', '#add-ip-form-btn', this.createOne);
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

        addOne: function(deviceTrustedIP) {
            var view = new DeviceTrustedIP({model: deviceTrustedIP});
            this.$tableBody.append(view.render().el);
        }
    });

    return DeviceTrustedIPView;
});

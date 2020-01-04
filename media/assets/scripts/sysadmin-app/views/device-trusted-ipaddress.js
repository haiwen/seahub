define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var DeviceTrustedIpAddressView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#device-trusted-ipaddress-item-tmpl').html()),

        events: {
            'click .trusted-ip-delete-btn': 'deleteIP'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        deleteIP: function() {
            var _this = this;
            var ip = this.model.get('ip');
            var popupTitle = gettext("Delete");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(ip) + '">' + Common.HTMLescape(ip) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({name: 'admin-device-trusted-ip'}),
                    type: "DELETE",
                    cache: false,
                    data: {'ipaddress': ip},
                    dataType: "JSON",
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data){
                        _this.$el.remove();
                        Common.feedback(gettext("Successfully deleted 1 item."), 'success');
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(popupTitle, popupContent, yesCallback);
            return false;
        },

        render: function() {
            var data = this.model.toJSON();
            this.$el.html(this.template(data));
            return this;
        }
    });

    return DeviceTrustedIpAddressView;
});

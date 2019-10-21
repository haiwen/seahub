define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var DeviceView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#device-item-tmpl').html()),

        events: {
            'click .unlink-device': 'unlinkDeviceWithConfirm'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = this.model.toJSON(),
                last_accessed = Moment(data['last_accessed']);

            data['time'] = last_accessed.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(last_accessed);

            this.$el.html(this.template(data));

            return this;
        },

        unlinkDeviceWithConfirm: function() {
            var _this = this,
                is_desktop_client = this.model.get('is_desktop_client'),
                device_name = this.model.get('device_name');

            if (is_desktop_client) {
                var title = gettext('Unlink device');
                var content = gettext('Are you sure you want to unlink this device?');
                var extraOption = gettext('Delete files from this device the next time it comes online.');

                var yesCallback = function (wipe_device) {
                    _this.model.unlink({
                        wipe_device: wipe_device,

                        success: function() {
                            _this.remove();

                            var msg = gettext("Successfully unlink %(name)s.")
                                .replace('%(name)s', device_name);
                            Common.feedback(msg, 'success');
                        },
                        error: function(xhr) {
                            Common.ajaxErrorHandler(xhr);
                        },
                        complete: function() {
                            $.modal.close();
                        }
                    });
                    return false;
                };
                Common.showConfirmWithExtraOption(title, content, extraOption, yesCallback);
            } else {
                _this.model.unlink({
                    wipe_device: true,
                    success: function() {
                        _this.remove();

                        var msg = gettext("Successfully unlink %(name)s.")
                            .replace('%(name)s', device_name);
                        Common.feedback(msg, 'success');
                    },
                    error: function(xhr) {
                        Common.ajaxErrorHandler(xhr);
                    }
                });
                return false;
            }
        }
    });
    return DeviceView;
});

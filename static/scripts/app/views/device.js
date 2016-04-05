define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, Moment, HLItemView, DropdownView) {
    'use strict';

    var DeviceView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#device-item-tmpl').html()),

        events: {
            'click .unlink-device': 'unlinkDevice'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = this.model.toJSON();

            if (typeof(data['synced_repos']) == 'undefined') {
                data['synced_repos'] = new Array();
            }

            if (data['synced_repos']) {
                data['synced_repos_length'] = data['synced_repos'].length;
            } else {
                data['synced_repos_length'] = 0;
            }

            var last_accessed = Moment(data['last_accessed']);
            data['time'] = last_accessed.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(last_accessed);

            this.$el.html(this.template(data));

            new DropdownView({
                el: this.$('.dropdown'),
                left: '-60px'
            });

            return this;
        },

        unlinkDevice: function() {
            var _this = this,
                device_name = this.model.get('device_name');

            this.model.unlink({
                success: function() {
                    _this.remove();

                    var msg = gettext("Successfully unlink %(name)s.")
                        .replace('%(name)s', Common.HTMLescape(device_name));
                    Common.feedback(msg, 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        }

    });

    return DeviceView;
});

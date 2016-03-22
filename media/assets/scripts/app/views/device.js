define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment'
], function($, _, Backbone, Common, Moment) {
    'use strict';

    var DeviceView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#device-item-tmpl').html()),

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .unlink-device': 'unlinkDevice',
            'click .js-toggle-repos': 'toggleSyncedRepos'
        },

        initialize: function() {
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                if (!$('.js-toggle-repos, .device-libs-popover').is(target)) {
                    $('.device-libs-popover').addClass('hide');
                    $('.dir-icon').removeClass('icon-caret-up').addClass('icon-caret-down');
                }
            });
        },

        render: function () {
            var data = this.model.toJSON();

            if (typeof(data['synced_repos']) == 'undefined') {
                data['synced_repos'] = new Array();
            }

            if (data['synced_repos']) {
                data['synced_repos_length'] = data['synced_repos'].length;
            } else {
                data['synced_repos_length'] = 0;
            }

            // convert to human readable time
            var now = new Date(),
                last_accessed = Moment(data['last_accessed']);

            data['time'] = last_accessed.format('LLLL');
            if (last_accessed - now > 0) {
                data['time_from_now'] = gettext("Just now");
            } else {
                data['time_from_now'] = last_accessed.fromNow();
            }

            this.$el.html(this.template(data));

            return this;
        },

        highlight: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        rmHighlight: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
        },

        toggleSyncedRepos: function(e) {
            var $current_icon= $(e.currentTarget).children('.dir-icon'),
                $current_popover = $(e.currentTarget).next('.device-libs-popover');

            $('.device-libs-popover').not($current_popover).addClass('hide');
            $('.dir-icon').not($current_icon).removeClass('icon-caret-up').addClass('icon-caret-down');

            $current_popover.toggleClass('hide');
            if ($current_icon.hasClass('icon-caret-up')) {
                $current_icon.removeClass('icon-caret-up').addClass('icon-caret-down');
            } else {
                $current_icon.removeClass('icon-caret-down').addClass('icon-caret-up');
            }

            return false
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

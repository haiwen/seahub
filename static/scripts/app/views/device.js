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

            new DropdownView({
                el: this.$('.js-dropdown')
            });

            return this;
        },

        _hidePopover: function(e) {
            var view = e.data.view;
            var target = e.target || event.srcElement;
            if (!$('.js-toggle-repos, .device-libs-popover').is(target)) {
               $('.device-libs-popover').addClass('hide');
                $('.dir-icon').removeClass('icon-caret-up').addClass('icon-caret-down');
                view.rmHighlight();
                $(document).off('click', view._hidePopover);
            }
        },

        toggleSyncedRepos: function(e) {
            var $icon= this.$('.dir-icon'),
                $popover = this.$('.device-libs-popover');

            if ($popover.is(':hidden')) {
                $icon.removeClass('icon-caret-down').addClass('icon-caret-up');
                $popover.removeClass('hide');
                $(document).on('click', { view: this }, this._hidePopover);
            } else {
                $icon.removeClass('icon-caret-up').addClass('icon-caret-down');
                $popover.addClass('hide');
                $(document).off('click', this._hidePopover);
            }

            return false;
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

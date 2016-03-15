define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    var DeviceView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#device-item-tmpl').html()),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .unlink-device': 'unlinkDevice',
            'click .lib-num': 'showSyncedRepos'
        },

        initialize: function() {
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
                last_accessed = Common.getMomentWithLocale(data['last_accessed']);

            data['time'] = last_accessed.format('LLLL');
            if (last_accessed - now > 0) {
                data['time_from_now'] = gettext("Just now");
            } else {
                data['time_from_now'] = last_accessed.fromNow();
            }

            this.$el.html(this.template(data));

            return this;
        },

        showAction: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideAction: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
        },

        showSyncedRepos: function(e) {
            var $lib_num = $(e.currentTarget);
            var lib_list = $lib_num.next('.lib-list');
            var dir_icon = $lib_num.children('.dir-icon');

            if (lib_list.length > 0) {
                lib_list.toggleClass('hide');
                if (lib_list.hasClass('hide')) {
                    dir_icon.removeClass('icon-caret-up').addClass('icon-caret-down');
                } else {
                    dir_icon.removeClass('icon-caret-down').addClass('icon-caret-up');
                }
            }
        },

        unlinkDevice: function() {
            var _this = this,
                data = {
                    'platform': this.model.get('platform'),
                    'device_id': this.model.get('device_id')
                };

            $.ajax({
                url: Common.getUrl({name: 'devices'}),
                type: 'DELETE',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: data,
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function (xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        }

    });

    return DeviceView;
});

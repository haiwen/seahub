define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/popover'
], function($, _, Backbone, Common, PopoverView) {
    'use strict';

    var View = PopoverView.extend({
        id: 'notice-popover',
        className: 'sf-popover',

        template:  _.template($('#notice-popover-tmpl').html()),

        initialize: function(options) {
            PopoverView.prototype.initialize.call(this);

            this.render();

            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
            this.$noticeList = this.$('.notice-list');

            this.$notifications = $("#notifications");
            this.$num = $('.num', this.$notifications);
            this.orig_doc_title = document.title;

            var _this = this;

            var reqUnreadNum = function() {
                $.ajax({
                    url: Common.getUrl({name: 'notifications'}),
                    dataType: 'json',
                    cache: false,
                    success: function(data) {
                        var count = data['unseen_count'],
                            $num = _this.$num;
                        $num.html(count);
                        if (count > 0) {
                            $num.removeClass('hide');
                            document.title = '(' + count + ')' + _this.orig_doc_title;
                        } else {
                            $num.addClass('hide');
                            document.title =  _this.orig_doc_title;
                        }

                        var $networkNotice = $('#network-top-notice');
                        if ($networkNotice.is(':visible')) {
                            $networkNotice.remove();
                        }
                    },
                    error: function(xhr) { // e.g. 401 UNAUTHORIZED
                        var $el;
                        if (xhr.responseText) {
                            if (xhr.status == 401) {
                                clearInterval(reqInterval); // stop sending requests
                                $el = $('<p class="top-bar fixed-top-bar">' + gettext("You have logged out.") + '<span class="top-bar-click">' + gettext("Log in") + '</span></p>');
                                $('#wrapper').prepend($el);
                            }
                        } else {
                            if ($('#network-top-notice').length == 0) {
                                $el = $('<p class="top-bar fixed-top-bar" id="network-top-notice">' + gettext("Please check the network.") + '<span class="top-bar-click">' + gettext("Refresh") + '</span></p>');
                                $('#wrapper').prepend($el);
                            }
                        }
                        $('.top-bar-click', $el).on('click', function() {
                            location.reload(true);
                        });
                    }
                });
            };
            reqUnreadNum();
            // request every `unread_notifications_request_interval` seconds
            var reqInterval = setInterval(reqUnreadNum, (app.pageOptions.unread_notifications_request_interval || 3*60)*1000);

            $('#notice-icon').on('click', function() {
                _this.toggle();
                return false;
            });
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        events: {
            'click .detail': 'viewDetail',
            'click .unread a': 'visitUnread'
        },

        viewDetail: function(e) {
            var $el = $(e.currentTarget);
            location.href = $('.brief a', $el.parent()).attr('href');
        },

        visitUnread: function(e) {
            var $el = $(e.currentTarget);
            var notice_id = $el.closest('.unread').data('id');
            var link_href = $el.attr('href');
            $.ajax({
                // set unread notice to be read
                url: Common.getUrl({name: 'notification'}),
                type: 'PUT',
                dataType: 'json',
                data:{'notice_id': notice_id},
                beforeSend: Common.prepareCSRFToken,
                success: function(data) {
                    location.href = link_href;
                    $el.closest('.unread').removeClass('unread').addClass('read');
                },
                error: function() {
                    location.href = link_href;
                }
            });
            return false;
        },

        // override hide function
        hide: function() {
            var _this = this;
            app.ui.currentPopover = null;
            this.$el.detach();

            if (this.$(".unread").length > 0) {
                // set all unread notice to be read
                $.ajax({
                    url: Common.getUrl({name: 'notifications'}),
                    type: 'PUT',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        _this.$num.html(0).addClass('hide');
                        document.title = _this.orig_doc_title;
                    }
                });
            }

            return false;
        },

        showContent: function() {
            var _this = this;

            this.$noticeList.addClass('hide');
            this.$error.hide();
            this.$loadingTip.show();

            $.ajax({
                url: Common.getUrl({name: 'get_popup_notices'}),
                dataType: 'json',
                success: function(data) {
                    _this.$loadingTip.hide();
                    _this.$noticeList.html(data['notice_html']).show();
                },
                error: function (xhr, textStatus, errorThrown) {
                    _this.$loadingTip.hide();
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$error.html(error_msg).show();
                }
            });

            this.$notifications.append(this.$el);
        }

    });

    return View;
});

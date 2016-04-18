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
        className: 'popover',

        template:  _.template($('#notice-popover-tmpl').html()),

        initialize: function(options) {
            PopoverView.prototype.initialize.call(this);

            this.render();
            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
            this.$noticeList = this.$('.notice-list');

            this.$notifications = $("#notifications");
            this.orig_doc_title = document.title;
            var _this = this;
            var reqUnreadNum = function() {
                $.ajax({
                    url: Common.getUrl({name: 'get_unseen_notices_num'}),
                    dataType: 'json',
                    cache: false,
                    success: function(data) {
                        var count = data['count'],
                            num = $('.num', _this.$notifications);
                        num.html(count);
                        if (count > 0) {
                            num.removeClass('hide');
                            document.title = '(' + count + ')' + _this.orig_doc_title;
                        } else {
                            num.addClass('hide');
                            document.title =  _this.orig_doc_title;
                        }
                    }
                });
            };
            reqUnreadNum();
            // request every 30s
            setInterval(reqUnreadNum, 30*1000);

            $('#notice-icon').click(function() {
                _this.toggle();
                return false;
            });
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        // override hide function
        hide: function() {
            var _this = this;
            app.ui.currentPopover = null;
            this.$el.detach();

            if (this.$(".unread").length > 0) {
                // set all unread notice to be read
                $.ajax({
                    url: Common.getUrl({name: 'set_notices_seen'}),
                    type: 'POST',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        $('.num', _this.$notifications).html(0).addClass('hide');
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

                    // set a notice to be read when <a> in it is clicked
                    $('.unread a', _this.$noticeList).click(function() {
                        var notice_id = $(this).parents('.unread').data('id');
                        var link_href = $(this).attr('href');
                        $.ajax({
                            url: Common.getUrl({name: 'set_notice_seen_by_id'}) + '?notice_id=' + encodeURIComponent(notice_id),
                            type: 'POST',
                            dataType: 'json',
                            beforeSend: Common.prepareCSRFToken,
                            success: function(data) {
                                location.href = link_href;
                            },
                            error: function() {
                                location.href = link_href;
                            }
                        });
                        return false;
                    });
                    $('.detail', _this.$noticeList).click(function() {
                        location.href = $('.brief a', $(this).parent()).attr('href');
                    });
                },
                error: function (xhr, textStatus, errorThrown) {
                    _this.$loadingTip.hide();
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error;
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.$error.html(err_msg).show();
                }
            });

            this.$notifications.append(this.$el);
            return false;
        }

    });

    return View;
});

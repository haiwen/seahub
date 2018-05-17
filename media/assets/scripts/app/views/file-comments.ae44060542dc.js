define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/file-comments',
    'app/views/file-comment'
], function($, _, Backbone, Common, Collection, ItemView) {
    'use strict';

    var View = Backbone.View.extend({

        id: 'file-comments',
        className: 'right-side-panel',

        template: _.template($('#file-comment-panel-tmpl').html()),

        initialize: function() {
            $("#main").append(this.$el);

            this.collection = new Collection();
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.reset);

            var _this = this;
            $(document).keydown(function(e) {
                // ESCAPE key pressed
                if (e.which == 27) {
                    _this.hide();
                }
            });
            $(window).resize(function() {
                _this.setConHeight();
            });
        },

        events: {
            'click .js-close': 'close',
            'submit .msg-form': 'formSubmit'
        },

        close: function() {
            this.hide();
            return false;
        },

        render: function(data) {
            this.$el.html(this.template(data));

            this.$listContainer = $('.file-discussion-list', this.$el);
            this.$emptyTip = $('.no-discussion-tip', this.$el);
            this.$loadingTip = $('.loading-tip', this.$el);
            this.$conError = $('.file-discussions-con .error', this.$el);
            this.$msgInput = $('[name="message"]', this.$el);
        },

        show: function(options) {
            this.is_repo_owner = options.is_repo_owner;
            this.repo_id = options.repo_id;
            this.path = options.path;

            this.collection.setData(this.repo_id);

            this.render({
                'icon_url': options.icon_url,
                'file_name': options.file_name
            });
            this.$el.css({'right': 0});
            this.setConHeight();
            this.getContent();
        },

        hide: function() {
            this.$el.css({'right': '-400px'});
            this.$el.empty();
        },

        reset: function() {
            this.$conError.hide();
            this.$loadingTip.hide();
            this.$listContainer.empty();

            if (this.collection.length) {
                this.$emptyTip.hide();
                this.collection.each(this.addOne, this);
                this.$listContainer.show();
                this.scrollConToBottom();
            } else {
                this.$emptyTip.show();
                this.$listContainer.hide();
            }
        },

        getContent: function() {
            var _this = this;

            this.collection.fetch({
                cache: false,
                data: {
                    p: this.path,
                    avatar_size: 64
                },
                reset: true,
                success: function() {
                },
                error: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.$conError.html(err_msg).show();
                }
            });
        },

        formSubmit: function() {
            var _this = this;
            var $formError = $('.msg-form .error', this.$el);
            var $submitBtn = $('[type="submit"]', this.$el)
                var msg = $.trim(this.$msgInput.val());
            if (!msg) {
                return false;
            }

            $formError.hide();
            Common.disableButton($submitBtn);

            $.ajax({
                url: Common.getUrl({name: 'file-comments', repo_id: this.repo_id}) +
                    '?p=' + encodeURIComponent(this.path) + '&avatar_size=64',
                type: 'POST',
                cache: false,
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'comment': msg
                },
                success: function(data) {
                    _this.$msgInput.val('');
                    _this.collection.add(data);
                    if (_this.$emptyTip.is(':visible')) {
                        _this.$emptyTip.hide();
                        _this.$listContainer.show();
                    }
                    _this.scrollConToBottom();
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    $formError.html(err_msg).show();
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });

            return false;
        },

        addOne: function(item) {
            var view = new ItemView({
                model: item,
                is_repo_owner: this.is_repo_owner,
                parentView: this
            });

            this.$listContainer.append(view.render().el);
        },

        setConHeight: function() {
            $('.file-discussions-con', this.$el).css({
                'max-height': $(window).height()
                    - this.$el.offset().top
                    - $('.file-discussions-hd', this.$el).outerHeight(true)
                    - $('.file-discussions-footer', this.$el).outerHeight(true)
            });
        },

        scrollConToBottom: function() {
            var $el = this.$('.file-discussions-con');
            $el.scrollTop($el[0].scrollHeight - $el[0].clientHeight);
        },

        replyTo: function(to_user) {
            var str = "@" + to_user + " ";
            var $input = this.$msgInput.val(str);
            Common.setCaretPos($input[0], str.length);
            $input.focus();
        }

    });

    return View;
});

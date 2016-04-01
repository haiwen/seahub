define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-discussions',
    'app/views/group-discussion',
    'app/views/widgets/popover'
], function($, _, Backbone, Common, GroupDiscussions, ItemView, PopoverView) {
    'use strict';

    var View = PopoverView.extend({
        id: 'group-discussions',
        className: 'popover',

        template:  _.template($('#group-discussions-tmpl').html()),

        initialize: function(options) {
            PopoverView.prototype.initialize.call(this);

            this.groupView = options.groupView;

            this.collection = new GroupDiscussions();
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.reset);

            this.render();
        },

        events: {
            'click .js-load-more': 'loadMore',
            'submit form': 'formSubmit'
        },

        addOne: function(item, collection, options) {
            var view = new ItemView({
                model: item,
                is_group_owner: this.is_group_owner,
                is_group_admin: this.is_group_admin,
                parentView: this
            });
            if (options.prepend) {
                this.$listContainer.append(view.render().el);
            } else {
                this.$listContainer.prepend(view.render().el);
            }
        },

        reset: function() {
            this.$error.hide();
            this.$loadingTip.hide();
            this.$listContainer.empty();
            if (this.collection.length) {
                this.$emptyTip.hide();
                this.collection.each(this.addOne, this);
                this.$listContainer.show();
                if (this.collection.current_page < this.collection.page_num) {
                    this.$loadMore.show();
                } else {
                    this.$loadMore.hide();
                }
                this.scrollConToBottom();
            } else {
                this.$emptyTip.show();
                this.$listContainer.hide();
                this.$loadMore.hide();
            }
        },

        render: function() {
            this.$el.html(this.template());

            this.$loadingTip = this.$('.loading-tip');
            this.$listContainer = this.$('#group-discussion-list');
            this.$emptyTip = this.$('.no-discussion-tip');
            this.$error = this.$('.error');
            this.$loadMore = this.$('.js-load-more');
        },

        showContent: function() {
            this.$listContainer.hide();
            this.$loadingTip.show();

            var _this = this;

            // the user's role in this group
            this.is_group_owner = false;
            this.is_group_admin = false;
            if (app.pageOptions.username == this.groupView.group.owner) {
                this.is_group_owner = true;
            } else if ($.inArray(app.pageOptions.username, this.groupView.group.admins) != -1) {
                this.is_group_admin = true;
            }

            this.collection.setGroupId(this.groupView.group.id);
            this.collection.fetch({
                cache: false,
                reset: true,
                data: {'avatar_size': 64},
                success: function(collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.$error.html(err_msg).show();
                }
            });

            $("#group").append(this.$el);
            app.router.navigate('group/' + this.groupView.group.id + '/discussions/');
        },

        // set max-height for '.popover-con'
        setConMaxHeight: function() {
            this.$('.popover-con').css({
                'max-height': $(window).height() - this.$el.offset().top
                    - this.$('.popover-hd').outerHeight(true)
                    - this.$('.popover-footer').outerHeight(true)
                    - 2 // 2: top, bottom border width of $el,
                    - 10 // 10: leave some margin at the bottom
            });
        },

        hide: function() {
            PopoverView.prototype.hide.call(this);
            app.router.navigate('group/' + this.groupView.group.id + '/');
        },

        replyTo: function(to_user) {
            var str = "@" + to_user + " ";
            var $input = this.$('[name="message"]').val(str);
            Common.setCaretPosition($input[0], str.length);
            $input.focus();
        },

        loadMore: function() {
            var _this = this;

            this.$loadMore.hide();
            this.$loadingTip.show();

            this.collection.fetch({
                cache: false,
                remove: false,
                data: {
                    'avatar_size': 64,
                    'page': this.collection.current_page + 1
                },
                success: function(collection, response, opts) { // this function will be excuted after 'addOne', i.e, after the newly fetched items are rendered.
                    // sumHeight: sum height of the newly added items('.msg')
                    var sumHeight = 0;
                    _this.$('.msg:lt(' + response.msgs.length +')').each(function() {
                        sumHeight += $(this).outerHeight(true);
                    });
                    // scroll
                    _this.$('.popover-con').scrollTop(sumHeight - 50); // 50: keep at least 50px gap from the top
                },
                error: function(collection, response, opts) {
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.$error.html(err_msg).show();
                },
                complete: function() {
                    _this.$loadingTip.hide();
                    if (_this.collection.current_page < _this.collection.page_num) {
                        _this.$loadMore.show();
                    } else {
                        _this.$loadMore.hide();
                    }
                }
            });
        },

        formSubmit: function() {
            var _this = this;
            var content = $.trim(this.$('[name="message"]').val());

            if (!content) {
                return false;
            }

            this.collection.create({
                content: content,
                avatar_size: 64
            }, {
                wait: true,
                validate: true,
                prepend: true,
                success: function() {
                    _this.$('[name="message"]').val('');
                    if (_this.collection.length == 1) {
                        _this.collection.reset(_this.collection.models);
                    } else {
                        _this.scrollConToBottom();
                    }
                },
                error: function(collection, response, options) {
                    var err_msg;
                    if (response.responseText) {
                        err_msg = response.responseJSON.error_msg;
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.$error.html(err_msg).show();
                }
            });

            return false;
        },

        // scroll '.popover-con' to the bottom
        scrollConToBottom: function() {
            var $el = this.$('.popover-con');
            $el.scrollTop($el[0].scrollHeight - $el[0].clientHeight);
        }

    });

    return View;
});

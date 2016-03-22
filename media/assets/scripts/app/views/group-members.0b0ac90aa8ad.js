define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-members',
    'app/views/group-member'
], function($, _, Backbone, Common, GroupMembers, ItemView) {
    'use strict';

    var View = Backbone.View.extend({
        el: '#group-members',

        initialize: function(options) {
            this.collection = new GroupMembers();
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.reset);

            this.$loadingTip = this.$('.loading-tip');
            this.$listContainer = $('#group-member-list');   
            this.$error = this.$('.error');

            var _this = this;
            $(window).resize(function() {
                _this.setConMaxHeight();
            });
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                var $popup = _this.$el,
                    $popup_switch = $('#group-members-icon');

                if ($('#group-members:visible').length &&
                    !$popup.is(target) &&
                    !$popup.find('*').is(target) &&
                    !$popup_switch.is(target)) {
                    _this.hide();
                }   
            });
        },

        events: {
            'click .close': 'hide'
        },

        addOne: function(item, collection, options) {
            var view = new ItemView({
                model: item
            });
            this.$listContainer.append(view.render().el);
        },

        reset: function() {
            this.$error.hide();
            this.$loadingTip.hide();
            this.$listContainer.empty();
            this.collection.each(this.addOne, this);
            this.$listContainer.show();
        },

        render: function() {
            this.$listContainer.hide();
            this.$loadingTip.show();

            var _this = this;
            this.collection.setGroupId(this.group_id);
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
        },

        // set max-height for '.popover-con'
        setConMaxHeight: function() {
            this.$('.popover-con').css({'max-height': $(window).height() - this.$el.offset().top - this.$('.popover-hd').outerHeight(true) - 2}); // 2: top, bottom border width of $el
        },

        show: function(options) {
            this.group_id = options.group_id;
            this.$el.show();
            this.setConMaxHeight();
            this.render();
            app.router.navigate('group/' + this.group_id + '/members/');
        },

        hide: function() {
            this.$el.hide();
            app.router.navigate('group/' + this.group_id + '/');
        }

    });

    return View;
});

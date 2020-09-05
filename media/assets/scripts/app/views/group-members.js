define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-members',
    'app/views/group-member',
    'app/views/widgets/popover'
], function($, _, Backbone, Common, GroupMembers, ItemView, PopoverView) {
    'use strict';

    var View = PopoverView.extend({
        id: 'group-members',
        className: 'sf-popover',

        template:  _.template($('#group-members-tmpl').html()),

        initialize: function(options) {
            PopoverView.prototype.initialize.call(this);
            this.groupView = options.groupView;
            this.collection = new GroupMembers();
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.reset);
            this.render();
        },

        events: {

        },

        addOne: function(item, collection, options) {
            var is_owner = false;
            if (item.get('email') === this.groupView.group.owner) {
                is_owner = true;
            }
            var view = new ItemView({
                is_owner: is_owner,
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
            this.$el.html(this.template());
            this.$loadingTip = this.$('.loading-tip');
            this.$listContainer = this.$('#group-member-list');
            this.$error = this.$('.error');
        },

        showContent: function() {
            this.$listContainer.hide();
            this.$loadingTip.show();

            var _this = this;
            this.collection.setGroupId(this.groupView.group.id);
            this.collection.fetch({
                cache: false,
                reset: true,
                data: {'avatar_size': 64},
                success: function(collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                    _this.$loadingTip.hide();
                }
            });

            var $icon = $("#group-members-icon");
            $icon.after(this.$el);
        }

    });

    return View;
});

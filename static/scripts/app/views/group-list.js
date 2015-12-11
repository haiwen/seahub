define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'app/views/group-list-item'
], function($, _, Backbone, Common, Groups, GroupListItemView) {
    'use strict';

    var GroupListView = Backbone.View.extend({
        tagName: 'ul',

        initialize: function(options) {
            this.groups = new Groups();
            this.sideNavView = options.sideNavView;

            this.listenTo(this.groups, 'reset', this.reset);
        },

        addOne: function(group_list_item) {
            var view = new GroupListItemView({model: group_list_item, sideNavView: this.sideNavView});
            this.$el.append(view.render().el);
        },

        reset: function() {
            this.$el.hide().empty();
            if (this.groups.length) {
                this.groups.each(this.addOne, this);
                this.$el.show();
            }
        },

        render: function() {
            this.groups.fetch({
                cache: false, // for IE
                reset: true,
                success: function(collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    //how to show error msg?
                }
            });
        }

    });

    return GroupListView;
});

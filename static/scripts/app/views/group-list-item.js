define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var GroupListItemView = Backbone.View.extend({
        tagName: 'li',

        template: _.template($('#group-list-item-tmpl').html()),

        initialize: function(options) {
            this.$id = this.model.get('id');
            this.$name = this.model.get('name');

            this.sideNavView = options.sideNavView;
        },

        render: function() {
            var obj = {
                group_id: this.$id,
                group_name: this.$name
            }
            this.$el.html(this.template(obj));
            if (this.sideNavView.data.cur_tab == 'group' && this.sideNavView.data.cur_group_id == this.$id) {
                this.$el.addClass('tab-cur');
            }
            return this;
        }
    });

    return GroupListItemView;
});

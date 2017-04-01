define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.magnific-popup',
    'app/views/starred-item',
    'app/collections/starred-items',
], function($, _, Backbone, Common, magnificPopup, StarredItem,
    StarredItemCollection) {
    'use strict';

    var StarredItemsView = Backbone.View.extend({
        id: 'starred-items',

        template: _.template($('#starred-items-tmpl').html()),

        initialize: function() {
            this.starredItems = new StarredItemCollection();
            this.listenTo(this.starredItems, 'reset', this.reset);
            this.listenTo(this.starredItems, 'add', this.addOne);
            this.render();
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$emptyTip.hide();
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent();
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        render: function() {
            this.$el.html(this.template());

            this.$table = this.$('table');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        reset: function() {
            this.$loadingTip.hide();

            if (this.starredItems.length > 0) {
                this.starredItems.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(starredItem) {
            var view = new StarredItem({model: starredItem});
            this.$tableBody.append(view.render().el);
        },

        getContent: function() {
            var _this = this;

            this.initPage()
            this.starredItems.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err_msg, 'error');
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            });
        }
    });
    return StarredItemsView;
});

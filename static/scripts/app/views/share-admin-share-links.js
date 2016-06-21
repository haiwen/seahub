define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/share-admin-share-links',
    'app/views/share-admin-share-link'
], function($, _, Backbone, Common, ShareAdminShareLinkCollection,
    ShareAdminShareLinkView) {

    'use strict';

    var ShareAdminShareLinksView = Backbone.View.extend({

        id: 'share-admin-links',

        template: _.template($('#share-admin-links-tmpl').html()),

        initialize: function() {
            this.links = new ShareAdminShareLinkCollection();
            this.listenTo(this.links, 'add', this.addOne);
            this.listenTo(this.links, 'reset', this.reset);
            this.render();
        },

        events: {
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        sortByName: function() {
            $('.by-time .sort-icon').hide();
            var links = this.links;
            var el = $('.by-name .sort-icon', this.$table);

            links.comparator = function(a, b) { // a, b: model
                var result = Common.compareTwoWord(a.get('obj_name'), b.get('obj_name'));
                if (el.hasClass('icon-caret-up')) {
                    return -result;
                } else {
                    return result;
                }
            };
            links.sort();

            links.comparator = function(item) {
              return item.get('is_dir');
            };
            links.sort();

            this.$tableBody.empty();
            links.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down').show();
            links.comparator = null;
            return false;
        },

        sortByTime: function() {
            $('.by-name .sort-icon').hide();
            var links = this.links;
            var el = $('.by-time .sort-icon', this.$table);
            links.comparator = function(a, b) { // a, b: model
                if (el.hasClass('icon-caret-down')) {
                    return a.get('expire_date_timestamp') < b.get('expire_date_timestamp') ? 1 : -1;
                } else {
                    return a.get('expire_date_timestamp') < b.get('expire_date_timestamp') ? -1 : 1;
                }
            };
            links.sort();
            this.$tableBody.empty();
            links.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down').show();
            links.comparator = null;
            return false;
        },

        render: function() {
            this.$el.html(this.template({'cur_tab': 'share-admin-share-links'}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showLinks();
        },

        showLinks: function() {
            this.initPage();
            this.links.fetch({
                cache: false,
                reset: true,
                error: function (xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.links.length) {
                this.$emptyTip.hide();
                this.$tableBody.empty();
                this.links.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        addOne: function(link) {
            var view = new ShareAdminShareLinkView({model: link});
            this.$tableBody.append(view.render().el);
        }

    });

    return ShareAdminShareLinksView;
});

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

        el: '.main-panel',

        template: _.template($('#share-admin-download-links-tmpl').html()),

        initialize: function() {
            this.links = new ShareAdminShareLinkCollection();
            this.listenTo(this.links, 'add', this.addOne);
            this.listenTo(this.links, 'reset', this.reset);
        },

        events: {
            'click #share-admin-download-links .by-name': 'sortByName',
            'click #share-admin-download-links .by-time': 'sortByTime'
        },

        // initialSort: dirs come first
        initialSort: function(a, b) { // a, b: model
            var a_is_dir = a.get('is_dir'),
                b_is_dir = b.get('is_dir');
            if (a_is_dir && !b_is_dir) {
                return -1;
            } else if (!a_is_dir && b_is_dir) {
                return 1;
            } else {
                return 0;
            }
        },

        sortByName: function() {
            var _this = this;
            var links = this.links;
            var $el = this.$sortByNameIcon;
            this.$sortByTimeIcon.hide();
            if ($el.hasClass('icon-caret-up')) {
                links.comparator = function(a, b) { // a, b: model
                    var initialResult = _this.initialSort(a, b);
                    if (initialResult != 0) {
                        return initialResult;
                    } else {
                        var result = Common.compareTwoWord(a.get('obj_name'), b.get('obj_name'));
                        return -result;
                    }
                };
            } else {
                links.comparator = function(a, b) { // a, b: model
                    var initialResult = _this.initialSort(a, b);
                    if (initialResult != 0) {
                        return initialResult;
                    } else {
                        var result = Common.compareTwoWord(a.get('obj_name'), b.get('obj_name'));
                        return result;
                    }
                };
            }
            links.sort();
            this.$tableBody.empty();
            links.each(this.addOne, this);
            $el.toggleClass('icon-caret-up icon-caret-down').show();
            links.comparator = null;
            return false;
        },

        sortByTime: function() {
            var _this = this;
            var links = this.links;
            var $el = this.$sortByTimeIcon;
            this.$sortByNameIcon.hide();
            if ($el.hasClass('icon-caret-down')) {
                links.comparator = function(a, b) { // a, b: model
                    var initialResult = _this.initialSort(a, b);
                    if (initialResult != 0) {
                        return initialResult;
                    } else {
                        return a.get('expire_date_timestamp') < b.get('expire_date_timestamp') ? 1 : -1;
                    }
                };
            } else {
                links.comparator = function(a, b) { // a, b: model
                    var initialResult = _this.initialSort(a, b);
                    if (initialResult != 0) {
                        return initialResult;
                    } else {
                        return a.get('expire_date_timestamp') < b.get('expire_date_timestamp') ? -1 : 1;
                    }
                };
            }
            links.sort();
            this.$tableBody.empty();
            links.each(this.addOne, this);
            $el.toggleClass('icon-caret-up icon-caret-down').show();
            links.comparator = null;
            return false;
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="share-admin-download-links"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$sortByNameIcon = this.$('.by-name .sort-icon');
            this.$sortByTimeIcon = this.$('.by-time .sort-icon');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        hide: function() {
            this.$mainCon.detach();
        },

        show: function() {
            this.renderMainCon();
            this.showContent();
        },

        showContent: function() {
            var _this = this;
            this.initPage();
            this.links.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var $error = _this.$('.error');
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                    _this.$loadingTip.hide();
                }
            });
        },

        initPage: function() {
            this.$table.hide();
            this.$sortByNameIcon.attr('class', 'sort-icon icon-caret-up').show();
            this.$sortByTimeIcon.attr('class', 'sort-icon icon-caret-down').hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$('.error').hide();
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

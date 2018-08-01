define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/share-admin-folders',
    'app/views/share-admin-folder'
], function($, _, Backbone, Common, ShareAdminFolderCollection, ShareAdminFolderView) {
    'use strict';

    var ShareAdminFoldersView = Backbone.View.extend({

        el: '.main-panel',

        template: _.template($('#share-admin-folders-tmpl').html()),

        initialize: function() {
            this.folders = new ShareAdminFolderCollection();
            this.listenTo(this.folders, 'add', this.addOne);
            this.listenTo(this.folders, 'reset', this.reset);

            var _this = this;
            $(document).on('click', function(e) {
                var target = e.target || event.srcElement;
                var $select = _this.$('.perm-select:visible');
                if ($select.length && !$select.is(target)) {
                    $select.hide();
                    $select.closest('tr').find('.cur-perm, .perm-edit-icon').show();
                }
            });
        },

        events: {
            'click #share-admin-folders .by-name': 'sortByName'
        },

        sortByName: function() {
            var folders = this.folders;
            var $el = this.$sortIcon;
            if ($el.hasClass('icon-caret-up')) {
                folders.comparator = function(a, b) { // a, b: model
                    var result = Common.compareTwoWord(a.get('folder_name'), b.get('folder_name'));
                    return -result;
                };
            } else {
                folders.comparator = function(a, b) { // a, b: model
                    var result = Common.compareTwoWord(a.get('folder_name'), b.get('folder_name'));
                    return result;
                };
            }
            folders.sort();
            this.$tableBody.empty();
            folders.each(this.addOne, this);
            $el.toggleClass('icon-caret-up icon-caret-down').show();
            folders.comparator = null;
            return false;
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="share-admin-folders"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$sortIcon = $('.by-name .sort-icon', this.$table);
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
            this.initPage();
            this.folders.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                    var $error = _this.$('.error');
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                }
            });
        },

        initPage: function() {
            this.$table.hide();
            this.$sortIcon.attr('class', 'sort-icon icon-caret-down').hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$('.error').hide();
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.folders.length) {
                this.$emptyTip.hide();
                this.$tableBody.empty();
                this.folders.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }
        },

        addOne: function(folder) {
            var view = new ShareAdminFolderView({model: folder});
            this.$tableBody.append(view.render().el);
        }

    });

    return ShareAdminFoldersView;
});

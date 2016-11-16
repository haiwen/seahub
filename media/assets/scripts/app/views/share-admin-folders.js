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

        id: 'share-admin-folders',

        template: _.template($('#share-admin-folders-tmpl').html()),

        initialize: function() {
            this.folders = new ShareAdminFolderCollection();
            this.listenTo(this.folders, 'add', this.addOne);
            this.listenTo(this.folders, 'reset', this.reset);
            this.render();

            var _this = this;
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                var $select = _this.$('.perm-select:visible');
                if ($select.length && !$select.is(target)) {
                    $select.hide();
                    $select.closest('tr').find('.cur-perm, .perm-edit-icon').show();
                }
            });
        },

        events: {
            'click .by-name': 'sortByName'
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

        render: function() {
            this.$el.html(this.template());
            this.$table = this.$('table');
            this.$sortIcon = $('.by-name .sort-icon', this.$table);
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

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.magnific-popup',
    'app/views/starred-file-item',
    'app/collections/starred-files'
], function($, _, Backbone, Common, magnificPopup, StarredFileItem,
    StarredFilesCollection) {
    'use strict';

    var StarredFileView = Backbone.View.extend({
        el: '.main-panel',

        template: _.template($('#starred-file-tmpl').html()),
        theadTemplate: _.template($('#starred-file-thead-tmpl').html()),

        initialize: function() {
            this.starredFiles = new StarredFilesCollection();
            this.listenTo(this.starredFiles, 'reset', this.reset);
        },

        addOne: function(starredFile) {
            var view = new StarredFileItem({model: starredFile});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$tableBody.empty();
            this.$loadingTip.hide();
            if (this.starredFiles.length) {
                this.$emptyTip.hide();
                this.renderThead();
                this.starredFiles.each(this.addOne, this);
                this.$table.show();
                this.getThumbnail();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        getThumbnail: function() {
            if (!app.pageOptions.enable_thumbnail) {
                return false;
            }

            var items = this.starredFiles.filter(function(item) {
                // 'item' is a model
                return Common.imageCheck(item.get('file_name')) || Common.videoCheck(item.get('file_name'));
            });
            if (items.length == 0) {
                return ;
            }

            var items_len = items.length;
            var thumbnail_size = app.pageOptions.thumbnail_default_size;

            var get_thumbnail = function(i) {
                var cur_item = items[i];
                $.ajax({
                    url: Common.getUrl({
                        name: 'thumbnail_create',
                        repo_id: cur_item.get('repo_id')
                    }),
                    data: {
                        'path': cur_item.get('path'),
                        'size': thumbnail_size
                    },
                    cache: false,
                    dataType: 'json',
                    success: function(data) {
                        cur_item.set({
                            'encoded_thumbnail_src': data.encoded_thumbnail_src
                        });
                    },
                    complete: function() {
                        if (i < items_len - 1) {
                            get_thumbnail(++i);
                        }
                    }
                });
            };
            get_thumbnail(0);
        },

        showStarredFiles: function() {
            this.$table.hide();
            this.$loadingTip.show();
            this.starredFiles.fetch({reset: true});
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="org-repos"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            this.$el.magnificPopup({
                type: 'image',
                delegate: '.img-name-link',
                tClose: gettext("Close (Esc)"), // Alt text on close button
                tLoading: gettext("Loading..."), // Text that is displayed during loading. Can contain %curr% and %total% keys
                gallery: {
                    enabled: true,
                    tPrev: gettext("Previous (Left arrow key)"), // Alt text on left arrow
                    tNext: gettext("Next (Right arrow key)"), // Alt text on right arrow
                    tCounter: gettext("%curr% of %total%") // Markup for "1 of 7" counter
                },
                image: {
                    titleSrc: function(item) {
                        var el = item.el;
                        var img_name = el[0].innerHTML;
                        var img_link = '<a href="' + el.attr('href') + '" target="_blank">' + gettext("Open in New Tab") + '</a>';
                        return img_name + '<br />' + img_link;
                    },
                    tError: gettext('<a href="%url%" target="_blank">The image</a> could not be loaded.') // Error message when image could not be loaded
                }
            });
        },

        renderThead: function() {
            this.$('thead').html(this.theadTemplate());
        },

        show: function() {
            this.renderMainCon();
            this.showStarredFiles();
        },

        hide: function() {
            this.$mainCon.detach();
        }

    });

    return StarredFileView;
});

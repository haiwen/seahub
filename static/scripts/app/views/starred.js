define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.magnific-popup',
    'app/views/starred-item',
    'app/collections/starred'
], function($, _, Backbone, Common, magnificPopup, StarredItem,
    StarredCollection) {
    'use strict';

    var StarredView = Backbone.View.extend({
        id: 'starred',

        template: _.template($('#starred-tmpl').html()),
        theadTemplate: _.template($('#starred-thead-tmpl').html()),

        initialize: function() {
            this.collection = new StarredCollection();
            this.listenTo(this.collection, 'reset', this.reset);
            this.render();
        },

        addOne: function(starredItem) {
            var view = new StarredItem({model: starredItem});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$tableBody.empty();
            this.$loadingTip.hide();
            if (this.collection.length) {
                this.$emptyTip.hide();
                this.renderThead();
                this.sortItems();
                this.collection.each(this.addOne, this);
                this.$table.show();
                this.getImageThumbnail();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        sortItems: function() {
            this.collection.comparator = function(a, b) {
                if (a.get('is_dir') && !b.get('is_dir')) {
                    return -1;
                }
                if (!a.get('is_dir') && b.get('is_dir')) {
                    return 1;
                }
            };
            this.collection.sort();
        },

        getImageThumbnail: function() {
            if (!app.pageOptions.enable_thumbnail) {
                return false;
            }

            var images = this.collection.filter(function(item) { // 'item' is a model
                return !item.get('is_dir') && Common.imageCheck(item.get('obj_name'));
            });
            if (images.length == 0) {
                return ;
            }

            var images_len = images.length;
            var thumbnail_size = app.pageOptions.thumbnail_default_size;

            var get_thumbnail = function(i) {
                var cur_img = images[i];
                $.ajax({
                    url: Common.getUrl({
                        name: 'thumbnail_create',
                        repo_id: cur_img.get('repo_id')
                    }),
                    data: {
                        'path': cur_img.get('path'),
                        'size': thumbnail_size
                    },
                    cache: false,
                    dataType: 'json',
                    success: function(data) {
                        cur_img.set({
                            'encoded_thumbnail_src': data.encoded_thumbnail_src
                        });
                    },
                    complete: function() {
                        if (i < images_len - 1) {
                            get_thumbnail(++i);
                        }
                    }
                });
            };
            get_thumbnail(0);
        },

        showStarredItems: function() {
            this.$table.hide();
            this.$loadingTip.show();
            this.collection.fetch({reset: true});
        },

        render: function() {
            this.$el.html(this.template());

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
            $("#right-panel").html(this.$el);
            this.showStarredItems();
        },

        hide: function() {
            this.$el.detach();
        }

    });

    return StarredView;
});

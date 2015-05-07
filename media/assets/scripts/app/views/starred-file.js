define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.magnific-popup',
    'app/views/starred-file-item',
    'app/collections/starred-files',
], function($, _, Backbone, Common, magnificPopup, StarredFileItem,
    StarredFilesCollection) {
    'use strict';

    var StarredFileView = Backbone.View.extend({

        el: $('#starred-file'),

        initialize: function() {
            this.$table = this.$('table');
            this.$tableBody = this.$('tbody');
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');

            this.starredFiles = new StarredFilesCollection();
            this.listenTo(this.starredFiles, 'reset', this.reset);

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

        addOne: function(starredFile) {
            var view = new StarredFileItem({model: starredFile});
            this.$tableBody.append(view.render().el);
        },

        reset: function() {
            this.$tableBody.empty();
            this.$loadingTip.hide();
            this.starredFiles.each(this.addOne, this);
            if (this.starredFiles.length) {
                this.$emptyTip.hide();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        hide: function() {
            this.$el.hide();
        },

        show: function() {
            this.$el.show();
            this.$table.hide();
            this.$loadingTip.show();
            this.starredFiles.fetch({reset: true});
        }

    });

    return StarredFileView;
});

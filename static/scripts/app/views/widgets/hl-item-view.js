define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    /*
     * Hightable Item View.
    */
    var HLItemView = Backbone.View.extend({
        tagName: 'tr',

        hiddenOperationClass: '.op-icon',

        initialize: function(options) {
            this.$el.on('mouseenter', _.bind(this.highlight, this));
            this.$el.on('mouseleave', _.bind(this.rmHighlight, this));
            this.$el.on('focus', '*', _.bind(this.focus, this));
        },

        focus: function() {
            // if there are dropdown items or freezeItemHightlight is set, don't highlight
            if (app.ui.currentDropdown || app.ui.freezeItemHightlight) {
                return true;
            }

            if (app.ui.currentHighlightedItem) {
                if (app.ui.currentHighlightedItem == this) {
                    return true;
                } else {
                    app.ui.currentHighlightedItem.rmHighlight();
                }
            }
            this.highlight();
            return true;
        },

        highlight: function() {
            // if there are dropdown items or freezeItemHightlight is set, don't highlight
            if (app.ui.currentDropdown || app.ui.freezeItemHightlight) {
                return;
            }
            app.ui.currentHighlightedItem = this;
            this.$el.addClass('hl').find(this.hiddenOperationClass).removeClass('vh');
        },

        rmHighlight: function() {
            if (app.ui.currentDropdown || app.ui.freezeItemHightlight) {
                return;
            }
            app.ui.currentHighlightedItem = null;
            this.$el.removeClass('hl');
            if ($(window).width() >= 768) {
                this.$el.find(this.hiddenOperationClass).addClass('vh');
            }
        }

    });

    return HLItemView;
});

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
            this.$el.removeClass('hl').find(this.hiddenOperationClass).addClass('vh');
        }

    });

    return HLItemView;
});

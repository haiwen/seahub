define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    /*
     * Popover View.
    */

    // There can be only one visible popover view
    $(document).click(function(e) {
        var view = app.ui.currentPopover;
        var target = e.target || event.srcElement;

        if (!view) {
            return true;
        }

        if (!view.$el.is(target)
            && !view.$el.find('*').is(target))
        {
            view.hide();
        }
        return true;
    });

    $(window).resize(function() {
        var view = app.ui.currentPopover;
        if (!view) {
            return true;
        }

        view.setConMaxHeight();
    });

    var PopoverView = Backbone.View.extend({

        initialize: function(options) {
            this.$el.on('click', '.close', _.bind(this.hide, this));
        },

        // set max-height for '.popover-con'
        setConMaxHeight: function() {
            this.$('.popover-con').css({'max-height': $(window).height() - this.$el.offset().top - this.$('.popover-hd').outerHeight(true) - 2}); // 2: top, bottom border width of $el
        },

        hide: function() {
            app.ui.currentPopover = null;
            this.$el.detach();
        },

        show: function() {
            app.ui.currentPopover = this;
            this.showContent();
            this.setConMaxHeight();
        },

        toggle: function() {
            if (app.ui.currentPopover) {
                if (app.ui.currentPopover != this) {
                    app.ui.currentPopover.hide();
                    this.show();
                } else {
                    this.hide();
                }
            } else {
                this.show();
            }
            return false;
        }

    });

    return PopoverView;
});

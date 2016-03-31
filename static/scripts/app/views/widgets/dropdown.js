define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    /*
     * Dropdown View.
    */

    // There can be only one visible dropdown view
    $(document).click(function(e) {
        var view = app.ui.currentDropdown;
        var target = e.target || event.srcElement;

        if (!view) {
            return true;
        }

        if (!view.$('.dropdown-menu').is(target)
            && !view.$('.dropdown-menu').find('*').is(target))
        {
            view.hide();
            if (app.ui.currentHighlightedItem) {
                app.ui.currentHighlightedItem.rmHighlight();
            }
        }
        return true;
    });

    var DropdownView = Backbone.View.extend({

        defaultOptions: {
            'left': '0px'
        },

        initialize: function(options) {
            this.$el.on('click', '.dropdown-toggle', _.bind(this.toggleDropdown, this));
            this.options = {};
            _.extend(this.options, this.defaultOptions, options);
        },

        hide: function() {
            app.ui.currentDropdown = null;
            this.$('.dropdown-menu').addClass('hide');
        },

        show: function() {
            var $menu = this.$('.dropdown-menu');
            app.ui.currentDropdown = this;
            if (this.options.right) {
                $menu.css('right', this.options.right);
            } else {
                $menu.css('left', this.options.left);
            }
            this.$('.dropdown-menu').removeClass('hide');
        },

        toggleDropdown: function() {
            if (app.ui.currentDropdown && app.ui.currentDropdown != this) {
                app.ui.currentDropdown.hide();
            }

            if (this.$('.dropdown-menu').is(':hidden')) {
                this.show();
            } else {
                this.hide();
            }

            return false;
        }

    });

    return DropdownView;
});

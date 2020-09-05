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
    $(document).on('click', function(e) {
        var view = app.ui.currentDropdown;
        var target = e.target || event.srcElement;

        if (!view) {
            return true;
        }

        if (!view.$('.sf-dropdown-menu').is(target) &&
            !view.$('.sf-dropdown-menu').find('*').is(target)) {
            view.hide();
            if (app.ui.currentHighlightedItem) {
                app.ui.currentHighlightedItem.rmHighlight();
            }
        }
        return true;
    });

    $(document).on('keydown', function(e) {
        // ESCAPE key pressed
        if (e.keyCode == 27) {
            var view = app.ui.currentDropdown;
            if (view) {
                view.hide();
                if (app.ui.currentHighlightedItem) {
                    app.ui.currentHighlightedItem.rmHighlight();
                }
            }
        }
    });

    var DropdownView = Backbone.View.extend({

        defaultOptions: {
            'left': '0px'
        },

        initialize: function(options) {
            this.$el.on('click', '.sf-dropdown-toggle', _.bind(this.toggleDropdown, this));
            this.$el.on('keydown', _.bind(this.handleKeydown, this));
            this.options = {};
            _.extend(this.options, this.defaultOptions, options);
        },

        hide: function() {
            app.ui.currentDropdown = null;
            this.$('.sf-dropdown-menu').addClass('hide').removeAttr('style'); // `removeAttr('style')`: clear position info
        },

        show: function() {
            var $toggle = this.$('.sf-dropdown-toggle');
            var $menu = this.$('.sf-dropdown-menu');
            app.ui.currentDropdown = this;
            if (this.options.right != undefined) {
                $menu.css('right', this.options.right);
            } else {
                $menu.css('left', this.options.left);
            }
            if ($toggle.offset().top + $toggle.outerHeight(true) + $menu.outerHeight(true) > $(window).scrollTop() + $(window).height()) {
                $menu.css({'bottom': $toggle.outerHeight(true) + 4});
            }
            this.$('.sf-dropdown-menu').removeClass('hide');
        },

        toggleDropdown: function() {
            if (app.ui.currentDropdown && app.ui.currentDropdown != this) {
                app.ui.currentDropdown.hide();
            }

            if (this.$('.sf-dropdown-menu').is(':hidden')) {
                this.show();
            } else {
                this.hide();
            }

            return false;
        },

        handleKeydown: function(event) {
            if (!/(38|40)/.test(event.which)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();

            var items = $.makeArray(this.$el.find('li a'));

            if (!items.length) {
                return;
            }

            var index = items.indexOf(event.target);
            if (event.which === 38 && index > 0) { // up
                index--;
            }

            if (event.which === 40 && index < items.length - 1) { // down
                index++;
            }

            items[index].focus();
        }

    });

    return DropdownView;
});

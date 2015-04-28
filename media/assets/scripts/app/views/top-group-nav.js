define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var GroupNavView = Backbone.View.extend({
        el: '.nav .nav-item-group',

        popupTemplate: _.template($('#top-group-nav-tmpl').html()),

        initialize: function() {
            var popup = $(this.popupTemplate({groups: app.pageOptions.top_nav_groups}));
            this.$el.append(popup);
            popup.css({'right': ($('#top-nav-grp').outerWidth() - popup.outerWidth())/6 * 5});
            this.popup = popup;
        },

        events: {
            'mouseenter': 'showPopup',
            'mouseleave': 'hidePopup',
            'mouseenter #top-nav-grp-list .item': 'highlightGroupItem',
            'mouseleave #top-nav-grp-list .item': 'rmHighlightGroupItem',
            'click #top-nav-grp-list .item': 'visitGroup'
        },

        showPopup: function(e) {
            this.popup.removeClass('hide');
        },

        hidePopup: function(e) {
            this.popup.addClass('hide');
        },

        highlightGroupItem: function(e) {
            $(e.currentTarget).addClass('hl').children('.a').removeClass('vh');
        },

        rmHighlightGroupItem: function(e) {
            $(e.currentTarget).removeClass('hl').children('.a').addClass('vh');
        },

        visitGroup: function(e) {
            this.hidePopup(e);
            location.href = $(e.currentTarget).attr('data-url');
        }
    });

    return GroupNavView;
});

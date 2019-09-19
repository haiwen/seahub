define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var sideNavView = Backbone.View.extend({
        el: '#side-nav',

        template: _.template($("#side-nav-tmpl").html()),

        initialize: function() {
            this.default_cur_tab = 'address-book';
            this.data = {
                'cur_tab': this.default_cur_tab
            };
            this.render();

            var _this = this;
            $('#js-toggle-side-nav').on('click', function() {
                _this.show();
                return false;
            });
            $(window).on('resize', function() {
                if ($(window).width() >= 768) {
                    _this.show();
                }
            });
        },

        render: function() {
            this.$el.html(this.template(this.data));
            return this;
        },

        setCurTab: function(cur_tab, options) {
            this.data.cur_tab = cur_tab || this.default_cur_tab;
            if (options) {
                $.extend(this.data, options);
            }
            this.render();
        },

        show: function() {
            this.$el.css({ 'left':'0px' });
        },

        hide: function() {
            this.$el.css({ 'left':'-300px' });
        },

        events: {
            'click .js-close-side-nav': 'closeNav',
            'click li a': 'visitLink'
        },

        closeNav: function() {
            this.hide();
            return false;
        },

        visitLink: function(e) {
            if ($(window).width() < 768) {
                this.hide();
            }
            return true;
        }

    });

    return sideNavView;
});

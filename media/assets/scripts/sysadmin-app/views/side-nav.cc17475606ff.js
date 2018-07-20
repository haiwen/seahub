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
            this.default_cur_tab = 'dashboard';
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
            'click li a': 'visitLink',
            'submit #libs-search-form': 'searchLibs', // for 'all' libs
            'submit #trash-libs-search-form': 'searchTrashLibs',
            'submit #groups-search-form': 'searchGroups'
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
        },

        // search libs by repo_name
        searchLibs: function() {
            var $form = this.$('#libs-search-form');
            var name = $.trim($('[name="name"]', $form).val());
            if (!name) {
                return false;
            }

            var url = $form.attr('action') + '?name=' + encodeURIComponent(name) + '&owner=';
            location.href = url;
            return false; // necessary
        },

        // search trash libs by owner
        searchTrashLibs: function() {
            var $form = this.$('#trash-libs-search-form');
            var owner = $.trim($('[name="name"]', $form).val());
            if (!owner) {
                return false;
            }

            var url = $form.attr('action') + '?name=' + encodeURIComponent(owner);
            location.href = url;
            return false; // necessary
        },

        searchGroups: function() {
            var $form = this.$('#groups-search-form');
            var name = $.trim($('[name="name"]', $form).val());
            if (!name) {
                return false;
            }

            var url = $form.attr('action') + '?name=' + encodeURIComponent(name);
            location.href = url;
            return false; // necessary
        }

    });

    return sideNavView;
});

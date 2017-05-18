define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        id: 'dirent-details',
        className: 'right-side-panel hide', // `hide` is for 'clickItem' in `views/dir.js`

        template:  _.template($('#dirent-details-tmpl').html()),

        initialize: function(options) {
            $("#main").append(this.$el);

            var _this = this;
            $(document).keydown(function(e) {
                // ESCAPE key pressed
                if (e.which == 27) {
                    _this.hide();
                }
            });

            $(window).resize(function() {
                _this.setConMaxHeight();
            });
        },

        events: {
            'click .js-close': 'close'
        },

        render: function() {
            this.$el.html(this.template(this.data));

            var _this = this;
            this.$('.dirent-details-img-container img').load(function() {
                _this.showImg();
            });
            this.$('.thumbnail').on('error', function() {
                _this.getBigIcon();
            });
        },

        setConMaxHeight: function() {
            this.$('.right-side-panel-con').css({
                'height': $(window).height() -  // this.$el `position:fixed; top:0;`
                    this.$('.right-side-panel-hd').outerHeight(true)
            });
        },

        hide: function() {
            this.$el.css({'right': '-400px'}).hide();
        },

        close: function() {
            this.hide();
            return false;
        },

        show: function(options) {
            this.data = options;
            this.render();
            this.$el.css({'right': '0px'}).show();
            this.setConMaxHeight();
        },

        showImg: function() {
            var $container = this.$('.dirent-details-img-container');
            $('.loading-icon', $container).hide();
            $('img', $container).show();
        },

        getBigIcon: function() {
            this.$('.thumbnail').attr({
                'src': this.data.big_icon_url,
                'width': 96
            }).removeClass('thumbnail');
        }

    });

    return View;
});

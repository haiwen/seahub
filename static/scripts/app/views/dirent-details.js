define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        id: 'dirent-details',
        className: 'details-panel right-side-panel',

        template:  _.template($('#dirent-details-tmpl').html()),

        initialize: function() {
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
            this.$('.details-panel-img-container img').load(function() {
                _this.showImg();
            });
            this.$('.thumbnail').on('error', function() {
                _this.getBigIcon();
            });
        },

        update: function(part_data) {
            var $container = this.$('.details-panel-text-info-container');
            $('.loading-icon', $container).hide();
            if (part_data.error_msg) {
                $('.error', $container).html(part_data.error_msg).show();
            } else {
                this.$('.dir-folder-counts').html(part_data.dir_count);
                this.$('.dir-file-counts').html(part_data.file_count);
                this.$('.dir-size').html(part_data.size);
                $('table', $container).show();
            }
        },

        setConMaxHeight: function() {
            this.$('.right-side-panel-con').css({
                'height': $(window).height() -  // this.$el `position:fixed; top:0;`
                    this.$('.right-side-panel-hd').outerHeight(true)
            });
        },

        hide: function() {
            this.$el.css({'right': '-320px'});
        },

        close: function() {
            this.hide();
            return false;
        },

        show: function(options) {
            this.data = options;
            this.render();
            this.$el.css({'right': '0px'});
            this.setConMaxHeight();
        },

        showImg: function() {
            var $container = this.$('.details-panel-img-container');
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

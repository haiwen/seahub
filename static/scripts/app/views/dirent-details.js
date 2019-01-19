define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        id: 'dirent-details',
        className: 'details-panel',

        template:  _.template($('#dirent-details-tmpl').html()),

        initialize: function(options) {
            this.dirView = options.dirView;

            var _this = this;
            $(document).on('keydown', function(e) {
                // ESCAPE key pressed
                if (e.which == 27) {
                    _this.hide();
                }
            });
        },

        events: {
            'click .js-close': 'close',
            'click .tags-edit-icon': 'switchToEditTags',
            'click .tags-submit-btn': 'submitTags'
        },

        render: function() {
            this.$el.html(this.template(this.data));

            var _this = this;
            this.$('.details-panel-img-container img').on('load', function() {
                _this.showImg();
            });
            this.$('.thumbnail').on('error', function() {
                _this.getBigIcon();
            });
        },

        // for dir
        update: function(part_data) {
            var $container = this.$('.details-panel-text-info-container');
            $('.loading-tip', $container).hide();
            if (part_data.error_msg) {
                $('.error', $container).html(part_data.error_msg).show();
            } else {
                $('table', $container).show();
            }
        },

        updateTags: function(part_data) {
            var $container = this.$('.tags-container');

            $('.loading-icon', $container).hide();
            if (part_data.error_msg) {
                $('.error', $container).html(part_data.error_msg).show();
            } else {
                var tags = part_data.tags;
                var str = '';
                var s2_tags = [];
                for (var i = 0, len = tags.length; i < len; i++) {
                    str += '<li class="cur-tag fleft">' + Common.HTMLescape(tags[i].name) + '</li>';
                    s2_tags.push({
                        'id': tags[i].name,
                        'text': tags[i].name
                    });
                }
                this.s2_tags = s2_tags;
                $('.cur-tags', $container).html(str).show();
                $('.tags-edit-icon', $container).show();
            }
        },

        switchToEditTags: function() {
            this.$('.cur-tags, .tags-edit-icon').hide();
            this.$('.tags-submit-btn').show();

            var $input = this.$('input.tags-input');
            var $s2_container = this.$('.tags-input.select2-container');
            if ($s2_container.length) {
                $input.select2('data', this.s2_tags);
                $s2_container.show();
            } else {
                $input.show()
                .select2({
                    tags: [],
                    formatNoMatches: gettext("No matches")
                })
                .select2('data', this.s2_tags);
            }
            return false;
        },

        submitTags: function() {
            var _this = this;
            var $input = this.$('.tags-input');
            var tags = $input.select2('val');
            var $submit = this.$('.tags-submit-btn');
            var $error = this.$('.tags-container .error');
            var error_msg;

            for (var i = 0, len = tags.length; i < len; i++) {
                if (tags[i].indexOf(',') != -1) {
                    error_msg = gettext("Tag should not include ','.");
                    break;
                }
            }
            if (error_msg) {
                $error.html(error_msg).show();
                return false;
            }

            Common.disableButton($submit);
            $.ajax({
                url: Common.getUrl({
                    'name': 'tags',
                    'repo_id': this.data.repo_id
                }),
                type: 'PUT',
                cache: false,
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'path': Common.pathJoin([this.data.dir_path, this.data.dirent.obj_name]),
                    'is_dir': this.data.dirent.is_dir ? true : false,
                    'names':  tags.join(',')
                },
                success: function(data) {
                    var tags = data.tags;
                    var str = '';
                    var s2_tags = [];
                    for (var i = 0, len = tags.length; i < len; i++) {
                        str += '<li class="cur-tag fleft">' + Common.HTMLescape(tags[i].name) + '</li>';
                        s2_tags.push({
                            'id': tags[i].name,
                            'text': tags[i].name
                        });
                    }
                    _this.s2_tags = s2_tags;

                    _this.$('.tags-input').hide();
                    $submit.hide();
                    _this.$('.cur-tags').html(str).show();
                    _this.$('.tags-edit-icon').show();
                },
                error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    $error.html(error_msg).show();
                },
                complete: function() {
                    Common.enableButton($submit);
                }
            });
        },

        hide: function() {
            this.$el.hide();
        },

        close: function() {
            this.hide();
            return false;
        },

        show: function(options) {
            var _this = this;
            this.data = options;
            this.render();

            if ($('#' + this.id).length == 0) {
                this.dirView.$mainCon.append(this.$el);
                if (!this.$el.is(':visible')) {
                    this.$el.show();
                }
            } else {
                this.$el.show();
            }
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

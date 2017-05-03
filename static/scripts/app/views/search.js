define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var View = Backbone.View.extend({
        el: $('#top-search-form')[0],

        template: _.template($('#top-search-form-tmpl').html()),
        resultItemTemplate: _.template($('#top-fast-search-result-item-tmpl').html()),

        resultsSelector: '#fast-search-results',

        initialize: function(options) {
            var _this = this;
            this.data = options || {search_repo_id: ''}; 
            this.render(this.data);

            $(window).resize(function() { _this.setResultsMaxHeight(); });

            $(document).click(function(e) {
                var target = e.target || event.srcElement;

                if (!_this.$el.is(target)
                        && !_this.$el.find('*').is(target)) {
                    _this.$(_this.resultsSelector).hide();
                }
            });
        },

        render: function(data) {
            $.extend(this.data, data);
            this.$el.html(this.template(data));
            return this;
        },

        events: {
            'submit': 'formSubmit',
            'keyup [name="q"]': 'realTimeSearch'
        },

        formSubmit: function() {
            if (!$.trim(this.$('[name="q"]').val())) {
                return false;
            }
        },

        realTimeSearch: function() {
            var keyword = $.trim(this.$('[name="q"]').val());
            if (!keyword) {
                return false;
            }

            if (this.timer) {
                clearTimeout(this.timer);
            }
            var _this = this;
            this.timer = setTimeout(function() { _this.realSearch(); }, 300);

            if (this.request &&
                this.request.readyState != 0 &&
                this.request.readyState != 4) {
                this.request.abort();
                this.request = null;
            }
        },

        realSearch: function() {
            var keyword = $.trim(this.$('[name="q"]').val());
            if (!keyword) {
                return false;
            }

            var search_data = {'q': keyword};
            var $results = this.$(this.resultsSelector);
            var _this = this;
            var $submitIcon = this.$('.search-submit').hide();
            var $loadingIcon = this.$('.loading-icon').show();

            if (this.data.search_repo_id) {
                $.extend(search_data, {'search_repo': this.data.search_repo_id});
            }

            this.request = $.ajax({
                url: Common.getUrl({'name': 'search'}), 
                cache: false,
                data: search_data,
                dataType: 'json',
                success: function(data) {
                    var shown = data.total > 10 ? 10 : data.total;
                    if (shown == 0) {
                        $('.sf-popover-con', $results).html('<p id="fast-search-no-result">' + gettext("No result found") + '</p>');
                    } else {
                        $('.sf-popover-con', $results).html(_this.renderResults(data.results.slice(0, shown)));

                        if (data.total > 10) {
                            var viewMoreUrl = app.config.siteRoot + 'search/?q=' + encodeURIComponent(search_data.q);
                            viewMoreUrl += search_data.search_repo ? '&search_repo=' + encodeURIComponent(search_data.search_repo) : '';
                            $('.sf-popover-con', $results).append('<a href="' + viewMoreUrl + '" id="fast-search-results-view-more">' + gettext("More") + '</a>');
                        }

                        // failed to load thumbnail
                        $('.search-results-file-icon', $results).on('error', function(e) {
                            var target = e.target || event.srcElement;
                            $(target).attr('src', Common.getFileIconUrl('example.png', 48)); // replace with an img file icon
                        });
                    }
                    _this.setResultsMaxHeight();
                    $results.show();
                },
                error: function() {
                    $results.hide();
                },
                complete: function() {
                    $loadingIcon.hide();
                    $submitIcon.show();
                }
            });
        },

        renderResults: function(data) {
            var html = '';
            var tmpl = this.resultItemTemplate;
            var renderItem = function(item_data) {
                if (item_data.is_dir) {
                    item_data.icon_url = Common.getDirIconUrl(false, 48);
                    item_data.item_view_url = "#common/lib/" + item_data.repo_id + Common.encodePath(item_data.fullpath);
                } else {
                    item_data.icon_url = Common.getFileIconUrl(item_data.name, 48);
                    item_data.is_img = Common.imageCheck(item_data.name);
                    item_data.thumbnail_url = '';
                    if (app.pageOptions.enable_thumbnail &&
                        !item_data.repo_encrypted &&
                        item_data.is_img) {
                        item_data.thumbnail_url = Common.getUrl({
                            'name': 'thumbnail_get',
                            'repo_id': item_data.repo_id,
                            'size': 192,
                            'path': Common.encodePath(item_data.fullpath)
                        });
                    }

                    item_data.item_view_url = app.config.siteRoot + "lib/" + item_data.repo_id + "/file" + Common.encodePath(item_data.fullpath);
                }

                item_data.name_title = item_data.fullpath.substr(1);
                item_data.parent_dir = item_data.fullpath.substring(0, item_data.fullpath.lastIndexOf('/'));
                item_data.parent_dir_url = "#common/lib/" + item_data.repo_id + Common.encodePath(item_data.parent_dir);
                item_data.parent_dir_path = item_data.repo_name + item_data.parent_dir;

                return tmpl(item_data);
            };

            for(var i = 0, len = data.length; i < len; i++) {
                html += renderItem(data[i]);
            }

            return html;
        },

        setResultsMaxHeight: function() {
            var $results = this.$(this.resultsSelector);
            $('.sf-popover-con', $results).css({'max-height': $(window).height() - $results.offset().top - 2 - 10}); // 2: top, bottom border width of $el; 10: bottom gap

            if ($(window).width() < 768) {
                $results.css({'width': this.$el.offset().left + this.$el.width()});
            } else if ($(window).width() == 768) {
                $results.css({'width': 430});
            } else {
                $results.css({'width': 500});
            }
        }

    });

    return View;
});

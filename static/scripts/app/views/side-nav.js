define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'js.cookie'
], function($, _, Backbone, Common, Cookie) {
    'use strict';

    var sideNavView = Backbone.View.extend({
        el: '.side-panel',

        template: _.template($("#side-nav-tmpl").html()),
        enableModTemplate: _.template($("#myhome-mods-enable-form-tmpl").html()),

        initialize: function() {
            this.default_cur_tab = 'mine';
            this.group_expanded = false;
            if (Cookie.get('group_expanded') &&
                Cookie.get('group_expanded') == 'true') {
                this.group_expanded = true;
            }
            this.data = {
                'cur_tab': this.default_cur_tab,
                'show_group_list': this.group_expanded, // when cur_tab is not 'group'
                'groups': app.pageOptions.groups,
                'mods_enabled': app.pageOptions.user_mods_enabled,
                'show_share_admin': false, // show 'share admin' nav list or not
                'can_add_repo': app.pageOptions.can_add_repo,
                'can_generate_share_link': app.pageOptions.can_generate_share_link,
                'can_generate_upload_link': app.pageOptions.can_generate_upload_link
            };
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
            this.$('#side-nav').html(this.template(this.data));
            return this;
        },

        events: {
            'click #group-nav a:first': 'toggleGroupList',
            'click #share-admin-nav a:first': 'toggleShareAdminList',
            'click #enable-mods': 'enableMods',
            'click .js-close': 'close',
            'click #side-nav li > a': 'visitLink',
            'click .js-about': 'showAbout',

            // for touch devices
            'touchstart .side-nav-con': 'conTouchStart'
        },

        conTouchStart: function() {
            this.$('.side-nav-con').css({'overflow':'auto'});
        },

        toggleGroupList: function() {
            var $icon = $('#group-nav .toggle-icon');

            $icon.toggleClass('icon-caret-left icon-caret-down');
            $('#group-nav .grp-list').slideToggle();

            if ($icon.hasClass('icon-caret-down')) {
                Cookie.set('group_expanded', 'true');
                this.data.show_group_list = true;
            } else {
                Cookie.set('group_expanded', 'false');
                this.data.show_group_list = false;
            }
            return false;
        },

        toggleShareAdminList: function() {
            var $shareAdmin = $('#share-admin-nav');

            $('.toggle-icon', $shareAdmin).toggleClass('icon-caret-left icon-caret-down');
            $('ul', $shareAdmin).slideToggle(250);
            return false;
        },

        enableMods: function () {
            var mods_enabled = app.pageOptions.user_mods_enabled;
            var form = $(this.enableModTemplate({
                    'mods_available': app.pageOptions.user_mods_available,
                    'mods_enabled': mods_enabled
                }));
            form.modal({focus:false});
            $('#simplemodal-container').css('height', 'auto');

            var checkbox = $('[name="personal_wiki"]'),
                original_checked = checkbox.prop('checked'),
               _this = this;

            form.on('submit', function() {
                var cur_checked = checkbox.prop('checked');
                if (cur_checked == original_checked) {
                    return false;
                }

                var submit_btn = form.children('[type="submit"]');
                Common.disableButton(submit_btn);

                $.ajax({
                    url: Common.getUrl({'name': 'user_enabled_modules'}),
                    type: cur_checked ? 'POST' : 'DELETE',
                    cache: false,
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    success: function() {
                        if (cur_checked) {
                            mods_enabled.push('personal wiki');
                        } else {
                            var index = mods_enabled.indexOf('personal wiki');
                            if (index > -1) {
                                mods_enabled.splice(index, 1); // rm the item
                            }
                        }
                        $.modal.close();
                        _this.render();
                    },
                    error: function(xhr) {
                        Common.ajaxErrorHandler(xhr);
                    }
                });

                return false;
            });

            return false;
        },

        setCurTab: function(cur_tab, options) {
            this.data.cur_tab = cur_tab || this.default_cur_tab;
            if (options) {
                $.extend(this.data, options);
            }

            if (this.$clickedTab) {
                // The user click a link and this.$clickedTab is set by visitLink()
                this.$('.tab-cur').removeClass('tab-cur');
                this.$clickedTab.addClass('tab-cur');
                this.$clickedTab = null;
            } else {
                // the first time the side nav is rendered or the side nav is re-rendered
                // when dismiss a group, leave a group
                this.render();
                var curTabTop = this.$('.tab-cur').offset().top;
                var visibleHeight = $(window).height() - this.$('.side-nav-footer').outerHeight(true);
                if (curTabTop > visibleHeight) {
                    this.$('.side-nav-con').css({'overflow':'auto'}).scrollTop(curTabTop - visibleHeight + this.$('.tab-cur').outerHeight(true) + 10).removeAttr('style');
                }
            }

        },

        updateGroups: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({name: 'groups'}),
                type: 'GET',
                dataType: 'json',
                cache: false,
                success: function(data) {
                    var groups = [];
                    for (var i = 0, len = data.length; i < len; i++) {
                        groups.push({
                            'id': data[i].id,
                            'name': data[i].name
                        });
                    }
                    groups.sort(function(a, b) {
                        return Common.compareTwoWord(a.name, b.name);
                    });

                    // update app.pageOptions.groups
                    app.pageOptions.groups = groups;

                    _this.data.groups = groups;
                    _this.render();
                },
                error: function() {
                }
            });
        },

        show: function() {
            this.$el.css({ 'left':'0px' });
        },

        hide: function() {
            this.$el.css({ 'left':'-300px' });
        },

        close: function() {
            this.hide();
            return false;
        },

        visitLink: function(e) {
            if ($(e.target).attr('href') !== "#") {
                this.$clickedTab = $(e.target).parent();
            }

            if ($(window).width() < 768) {
                if ($(e.target).attr('href') !== "#") {
                    // except for groups toggle link
                    this.hide();
                }
            }
            return true;
        },

        showAbout: function() {
            var $about = this.$('.about-content');
            $about.modal();
            return false;
        }

    });

    return sideNavView;
});

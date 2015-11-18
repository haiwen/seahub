define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var MyhomeSideNavView = Backbone.View.extend({
        el: '#myhome-side-nav',

        template: _.template($("#myhome-side-nav-tmpl").html()),
        enableModTemplate: _.template($("#myhome-mods-enable-form-tmpl").html()),

        initialize: function() {
            this.default_cur_tab = 'mine';
            this.default_cur_group_tab = null;
            this.default_cur_group_scrollTop = 0;
            this.data = {
                'cur_tab': this.default_cur_tab,
                'cur_group_tab': this.default_cur_group_tab,
                'group_scrollTop': this.default_cur_group_scrollTop,
                'mods_enabled': app.pageOptions.user_mods_enabled,
                'can_add_repo': app.pageOptions.can_add_repo,
                'can_view_org': app.pageOptions.can_view_org,
                'groups': app.pageOptions.groups,
                'events_enabled': app.pageOptions.events_enabled
            };
            this.render();
        },

        render: function() {
            this.$el.html(this.template(this.data));
            this.$('.side-tabnav-tabs-groups').scrollTop(this.data.group_scrollTop);
            return this;
        },

        events: {
            'click #myhome-enable-mods': 'enableMods',
            'click .group': 'toggleGroups',
            'mouseover .side-tabnav-tabs-groups': 'showGroupsScrollbar',
            'mouseout .side-tabnav-tabs-groups': 'hideGroupsScrollbar'
        },

        enableMods: function () {
            var mods_enabled = app.pageOptions.user_mods_enabled;
            var form = $(this.enableModTemplate({
                    'mods_available': app.pageOptions.user_mods_available,
                    'mods_enabled': mods_enabled
                }));
            form.modal();
            $('#simplemodal-container').css('height', 'auto');

            $('.checkbox-orig', form).click(function() {
                $(this).parent().toggleClass('checkbox-checked');
            });

            var checkbox = $('[name="personal_wiki"]'),
                original_checked = checkbox.prop('checked'),
               _this = this;
            form.submit(function() {
                var cur_checked = checkbox.prop('checked');
                if (cur_checked == original_checked) {
                    return false;
                }
                Common.ajaxPost({
                    form: form,
                    form_id: form.attr('id'),
                    post_url: Common.getUrl({
                        'name': 'toggle_personal_modules'
                    }),
                    post_data: {'personal_wiki': cur_checked },
                    after_op_success: function () {
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
                    }
                });
                return false;
            });
        },

        toggleGroups: function() {
            if (this.$('.show-icon').hasClass('icon-caret-left')) {
                if (this.$('.show-icon').hasClass('left-clockwise')) {
                    this.$('.show-icon').removeClass('left-clockwise').addClass('left-eastern');
                    this.$('.side-tabnav-tabs-groups').css('height', 0).removeClass('hide').animate({height: '150'}, 200);
                } else if (this.$('.show-icon').hasClass('left-eastern')) {
                    this.$('.show-icon').removeClass('left-eastern').addClass('left-clockwise');
                    this.$('.side-tabnav-tabs-groups').animate({height: '0'}, 200);
                } else {
                    this.$('.show-icon').addClass('left-eastern');
                    this.$('.side-tabnav-tabs-groups').css('height', 0).removeClass('hide').animate({height: '150'}, 200);
                }
            } else {
                if (this.$('.show-icon').hasClass('down-eastern')) {
                    this.$('.show-icon').removeClass('down-eastern').addClass('down-clockwise');
                    this.$('.side-tabnav-tabs-groups').animate({height: '0'}, 200);
                } else if (this.$('.show-icon').hasClass('down-clockwise')) {
                    this.$('.show-icon').removeClass('down-clockwise').addClass('down-eastern');
                    this.$('.side-tabnav-tabs-groups').css('height', 0).removeClass('hide').animate({height: '150'}, 200);
                } else {
                    this.$('.show-icon').addClass('down-clockwise');
                    this.$('.side-tabnav-tabs-groups').removeClass('hide').animate({height: '0'}, 200);
                }
            }
        },

        showGroupsScrollbar: function() {
            this.$('.side-tabnav-tabs-groups').css({'overflow': 'auto'});
        },

        hideGroupsScrollbar: function() {
            this.$('.side-tabnav-tabs-groups').css({'overflow': 'hidden'});
        },

        show: function(options) {
            if (options && options.cur_tab) {
                this.data.cur_tab = options.cur_tab;
                if (options.cur_group_tab) {
                    this.data.cur_group_tab = options.cur_group_tab;
                    this.data.group_scrollTop = options.group_scrollTop;
                } else {
                    this.data.cur_group_tab = this.default_group_tab;
                    this.data.group_scrollTop = this.default_cur_group_scrollTop;
                }
                this.render();
            } else {
                if (this.data.cur_tab != this.default_cur_tab) {
                    this.data.cur_tab = this.default_cur_tab;
                    this.data.cur_group_tab = this.default_group_tab;
                    this.data.group_scrollTop = this.default_cur_group_scrollTop;
                    this.render();
                }
            }
            this.$el.show();
        },

        hide: function() {
            this.$el.hide();
        }

    });

    return MyhomeSideNavView;
});

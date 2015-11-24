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
        enableModTemplate: _.template($("#myhome-mods-enable-form-tmpl").html()),

        initialize: function() {
            this.default_cur_tab = 'mine';
            this.data = {
                'cur_tab': this.default_cur_tab,
                'mods_enabled': app.pageOptions.user_mods_enabled,
                'can_add_repo': app.pageOptions.can_add_repo,
            };
            this.render();
            this.$el.show();
        },

        render: function() {
            this.$el.html(this.template(this.data));
            return this;
        },

        events: {
            'click #group-nav a:first': 'toggleGroupList',
            'mouseenter #group-nav .grp-list': 'mouseEnterGroupList', 
            'mouseleave #group-nav .grp-list': 'mouseLeaveGroupList', 
            'click #enable-mods': 'enableMods'
        },

        toggleGroupList: function () {
            $('#group-nav .toggle-icon').toggleClass('icon-caret-left icon-caret-down');
            $('#group-nav .grp-list').slideToggle();
            return false;
        },

        mouseEnterGroupList: function () {
            $('#group-nav .grp-list').css({'overflow': 'auto'});
        },

        mouseLeaveGroupList: function () {
            $('#group-nav .grp-list').css({'overflow': 'hidden'});
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

        setCurTab: function (cur_tab, options) {
            this.data.cur_tab = cur_tab || this.default_cur_tab;
            if (options) {
                $.extend(this.data, options);
            }
            this.render();
        }

    });

    return sideNavView;
});

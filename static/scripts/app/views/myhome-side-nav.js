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
            this.default_cur_tab = 'libs';
            this.data = {
                'cur_tab': this.default_cur_tab,
                'mods_enabled': app.pageOptions.user_mods_enabled,
                'can_add_repo': app.pageOptions.can_add_repo,
                'events_enabled': app.pageOptions.events_enabled
            };
            this.render();
        },

        render: function() {
            this.$el.html(this.template(this.data));
            return this;
        },

        events: {
            'click #myhome-enable-mods': 'enableMods'
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

        show: function(options) {
            if (options && options.cur_tab) {
                this.data.cur_tab = options.cur_tab;
                this.render();
            } else {
                if (this.data.cur_tab != this.default_cur_tab) {
                    this.data.cur_tab = this.default_cur_tab;
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

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
            this.render();
        },

        render: function() {
            this.$el.html(this.template({
                'mods_enabled': app.pageOptions.user_mods_enabled,
                'events_enabled': app.pageOptions.events_enabled
            }));
        },

        events: {
            'click #myhome-enable-mods': 'enableMods'
        },

        enableMods: function () {
            var form = $(this.enableModTemplate({
                    'mods_available': app.pageOptions.user_mods_available,
                    'mods_enabled': app.pageOptions.user_mods_enabled
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
                        'name': 'toggle_personal_modules',
                    }),
                    post_data: {'personal_wiki': cur_checked },
                    after_op_success: function () {
                        if (cur_checked) {
                            // enable personal wiki
                            app.pageOptions.user_mods_enabled.push('personal wiki');
                        } else {
                            // disable personal wiki
                            var index = app.pageOptions.user_mods_enabled.indexOf('personal wiki');
                            if (index > -1) {
                                app.pageOptions.user_mods_enabled.splice(index, 1);
                            }
                        }
                        $.modal.close();
                        _this.render();
                    }
                });
                return false;
            });
        },

        show: function() {
            this.$el.show();
        },

        hide: function() {
            this.$el.hide();
        }

    });

    return MyhomeSideNavView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var GroupSideNavView = Backbone.View.extend({
        el: '#grp-side-nav',

        template: _.template($("#group-side-nav-tmpl").html()),
        enableModTemplate: _.template($("#group-mods-enable-form-tmpl").html()),

        initialize: function() {
        },

        render: function (group_id) {
            if (this.group_id && this.group_id == group_id) {
                return;
            }
            this.group_id = group_id;
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'group_basic_info',
                    'group_id': this.group_id
                }),
                cache: false,
                dataType: 'json',
                success: function (data) {
                    _this.$el.html(_this.template(data));
                    // for 'enable mod'
                    _this.mods_available = data.mods_available;
                    _this.mods_enabled = data.mods_enabled;
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error;
                    } else {
                        err_msg = gettext("Please check the network.");
                    }
                    _this.$el.html('<p class="error">' + err_msg + '</p>');
                }
            });
        },

        events: {
            'click #enable-mods': 'enableMods'
        },

        enableMods: function () {
            var form = $(this.enableModTemplate({
                'id': this.group_id,
                'mods_available': this.mods_available,
                'mods_enabled': this.mods_enabled
            }));
            form.modal();
            $('#simplemodal-container').css('height', 'auto');
            $('.checkbox-orig', form).click(function() {
                $(this).parent().toggleClass('checkbox-checked');
            });
            // TODO: after form submit, page goes to http://127.0.0.1:8000/
        },

        show: function() {
            this.$el.show();
        },

        hide: function() {
            this.$el.hide();
        }

    });

    return GroupSideNavView;
});

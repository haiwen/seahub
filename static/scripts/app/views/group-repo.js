define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, HLItemView) {
    'use strict';

    var GroupRepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#group-repo-tmpl').html()),

        events: {
            'click .cancel-share': 'unshare'
        },

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);
            
            this.group_id = options.group_id;
            this.is_staff = options.is_staff;

            this.show_shared_by = true; // default
            if (options.show_shared_by !== undefined) { // e.g. views/group-item.js
                this.show_shared_by = options.show_shared_by;
            }

            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 96 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            $.extend(obj, {
                group_id: this.group_id,
                is_staff: this.is_staff,
                // for '#groups' (no 'share_from_me')
                share_from_me: app.pageOptions.username == this.model.get('owner') ? true : false,
                // 'owner_name' for '#groups', 'owner_nickname' for '#group/id/'
                owner_name: this.model.get('owner_nickname') || this.model.get('owner_name'),
                show_shared_by: this.show_shared_by,
                icon_url: icon_url,
                icon_title: this.model.getIconTitle()
            });
            this.$el.html(this.template(obj));
            return this;
        },

        unshare: function() {
            var lib_name = this.model.get('name');
            this.model.destroy({
                wait: true,
                success: function() {
                    var msg = gettext('Successfully unshared {placeholder}').replace('{placeholder}', '<span class="op-target">' + lib_name + '</span>');
                    Common.feedback(msg, 'success', Common.SUCCESS_TIMOUT);
                },
                error: function(model, response) {
                    var err;
                    if (response.responseText) {
                        err = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err, 'error');
                }
            });

            return false;
        }

    });

    return GroupRepoView;
});

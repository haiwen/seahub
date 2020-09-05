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

        template: _.template($('#group-library-item-tmpl').html()),

        events: {
            'click .repo-unshare-btn': 'unshareGroupLibrary'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        unshareGroupLibrary: function() {
            var _this = this;
            var repo_name = this.model.get('name');
            var popupTitle = gettext("Unshare Library");
            var popupContent = gettext("Are you sure you want to unshare %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(repo_name) + '">' + Common.HTMLescape(repo_name) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'admin-group-library',
                        'group_id': _this.model.get('group_id'),
                        'repo_id': _this.model.get('repo_id')
                    }),
                    type: 'DELETE',
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        var msg = gettext("Successfully unshared library {placeholder}").replace('{placeholder}', repo_name);
                        Common.feedback(msg, 'success');
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(popupTitle, popupContent, yesCallback);
            return false;
        },

        render: function() {
            var data = this.model.toJSON(),
                icon_size = Common.isHiDPI() ? 48 : 24,
                icon_url = this.model.getIconUrl(icon_size);

            data['icon_url'] = icon_url;
            data['icon_title'] = this.model.getIconTitle();
            data['formatted_size'] = Common.fileSizeFormat(data['size'], 1),
            data['enable_sys_admin_view_repo'] = app.pageOptions.enable_sys_admin_view_repo;
            data['is_pro'] = app.pageOptions.is_pro;
            this.$el.html(this.template(data));

            return this;
        }

    });

    return GroupRepoView;
});

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

        template: _.template($('#address-book-group-library-item-tmpl').html()),

        events: {
            'click .repo-delete-btn': 'del'
        },

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);

            this.group_id = options.group_id;
        },

        del: function() {
            var _this = this;
            var repo_name = this.model.get('repo_name') || this.model.get('name');
            var popupTitle = gettext("Delete Library");
            var popupContent = gettext("Are you sure you want to delete %s ?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(repo_name) + '">' + Common.HTMLescape(repo_name) + '</span>');
            var yesCallback = function() {
                var url_options = {
                    group_id: _this.group_id,
                    repo_id: _this.model.get('repo_id')
                };
                if (app.pageOptions.org_id) { // org admin
                    $.extend(url_options, {
                        name: 'org-admin-group-owned-library',
                        org_id: app.pageOptions.org_id
                    });
                } else {
                    $.extend(url_options, {
                        name: 'admin-group-owned-library'
                    });
                }

                $.ajax({
                    url: Common.getUrl(url_options),
                    type: 'DELETE',
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        var msg = gettext("Successfully deleted library {placeholder}").replace('{placeholder}', repo_name);
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
            data['name'] = data.name || data.repo_name; 
            data['formatted_size'] = Common.fileSizeFormat(data['size'], 1),
            data['enable_sys_admin_view_repo'] = app.pageOptions.enable_sys_admin_view_repo;
            data['is_pro'] = app.pageOptions.is_pro;
            this.$el.html(this.template(data));

            return this;
        }

    });

    return GroupRepoView;
});

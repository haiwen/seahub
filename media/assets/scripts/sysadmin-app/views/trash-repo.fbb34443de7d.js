define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var TrashRepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#trash-library-item-tmpl').html()),

        events: {
            'click .repo-delete-btn': 'deleteTrashLibrary',
            'click .repo-restore-btn': 'restoreTrashLibrary'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        deleteTrashLibrary: function() {
            var _this = this;
            var repo_name = this.model.get('name');
            var popupTitle = gettext("Delete Library");
            var popupContent = gettext("Are you sure you want to delete %s completely?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(repo_name) + '">' + Common.HTMLescape(repo_name) + '</span>'); 
            var yesCallback = function() { 
                $.ajax({
                    url: Common.getUrl({
                        'name':'admin-trash-library',
                        'repo_id': _this.model.get('id')
                    }),
                    type: 'DELETE',
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        Common.feedback(gettext("Success"), 'success');
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

        restoreTrashLibrary: function() {
            var _this = this;
            var repo_name = this.model.get('name');
            var popupTitle = gettext("Restore Library");
            var popupContent = gettext("Are you sure you want to restore %s?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(repo_name) + '">' + Common.HTMLescape(repo_name) + '</span>'); 
            var yesCallback = function() { 
                $.ajax({
                    url: Common.getUrl({
                        'name':'admin-trash-library',
                        'repo_id': _this.model.get('id')
                    }),
                    type: 'PUT',
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$el.remove();
                        Common.feedback(gettext("Success"), 'success');
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
                icon_url = this.model.getIconUrl(icon_size),
                delete_time = Moment(data['delete_time']);

            data['icon_url'] = icon_url;
            data['icon_title'] = this.model.getIconTitle();
            data['time'] = delete_time.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(delete_time);

            this.$el.html(this.template(data));

            return this;
        }

    });

    return TrashRepoView;
});

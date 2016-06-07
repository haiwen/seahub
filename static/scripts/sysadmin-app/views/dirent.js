define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var DirentView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#dirent-item-tmpl').html()),

        events: {
            'click .dirent-download-btn': 'downloadDirent',
            'click .dirent-delete-btn': 'deleteDirent'
        },

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);
            this.dir = options.dirView.dir;
        },

        downloadDirent: function() {
            $.ajax({
                url: this.model.getDownloadUrl(),
                dataType: 'json',
                success: function(data) {
                    location.href = data['download_url'];
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            })
            return false;
        },

        deleteDirent: function() {
            var _this = this;
            $.ajax({
                url: this.model.getDeleteUrl(),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function() {
                    _this.$el.remove();
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            })
            return false;
        },

        render: function() {
            var file_icon_size = Common.isHiDPI() ? 48 : 24;
            var data = this.model.toJSON(),
                last_update = Moment(data['last_update']);

            data['time'] = last_update.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(last_update);
            data['icon_url'] = this.model.getIconUrl(file_icon_size);
            if (this.model.get('is_file')) {
                data['download_url'] = this.model.getDownloadUrl();
            } else {
                data['url'] = this.model.getWebUrl();
            }
            data['repo_id'] = this.dir.repo_id;
            data['is_system_library'] = this.dir.is_system_library;

            this.$el.html(this.template(data));

            return this;
        }

    });

    return DirentView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var StarredItemView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#starred-item-tmpl').html()),
        mobileTemplate: _.template($('#starred-item-mobile-tmpl').html()),

        events: {
            'click .unstar': 'unstar'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function () {
            var data = this.model.toJSON(),
                icon_size = Common.isHiDPI() ? 96 : 24,
                mtime = Moment(data['mtime']),
                tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;

            data['repo_url'] = this.model.getRepoUrl();
            data['dirent_url'] = this.model.getDirentUrl();
            data['icon_url'] = this.model.getIconUrl(icon_size);
            data['time'] = mtime.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(mtime);

            this.$el.html(tmpl(data));
            return this;
        },

        unstar: function() {
            var _this = this,
                repo_id = this.model.get('repo_id'),
                path = this.model.get('path');

            $.ajax({
                url: Common.getUrl({name: 'starred_items'}),
                data: {
                    'repo_id': repo_id,
                    'path': path
                },
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully unstarred 1 item."), 'success');
                },
                error: function (xhr) {
                    Common.ajaxErrorHandler(xhr);
                },
                complete: function() {
                    $.modal.close();
                }
            });

            return false;
        }

    });

    return StarredItemView;
});

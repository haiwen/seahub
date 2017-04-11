define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var StarredView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#starred-item-tmpl').html()),
        mobileTemplate: _.template($('#starred-item-mobile-tmpl').html()),

        events: {
            'click .unstar': 'unstar'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);

            this.listenTo(this.model, "change", this.render);
        },

        render: function () {
            var data = this.model.toJSON();

            var icon_size = Common.isHiDPI() ? 48 : 24;
            data.icon_url = this.model.getIcon(icon_size);
            data.is_img = Common.imageCheck(data['obj_name']);
            data.encoded_thumbnail_src = this.model.get('encoded_thumbnail_src') || '';
            data.item_url = this.model.getItemUrl();
            data.encoded_path = Common.encodePath(data['path']);

            var mtime = Moment(data['mtime']);
            data.time = mtime.format('LLLL');
            data.mtime_relative = Common.getRelativeTimeStr(mtime);

            var tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;
            this.$el.html(tmpl(data));
            return this;
        },

        unstar: function() {
            var _this = this;
            var obj_name = this.model.get('obj_name');
            $.ajax({
                url: Common.getUrl({name: 'starred_items'}),
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                data: {
                    'repo_id': this.model.get('repo_id'),
                    'path': this.model.get('path'),
                    'is_dir': this.model.get('is_dir')
                },
                success: function() {
                    _this.remove();
                    Common.feedback(gettext("Successfully unstarred {placeholder}").replace('{placeholder}', obj_name), 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        }

    });

    return StarredView;
});

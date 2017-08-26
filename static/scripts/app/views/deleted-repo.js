define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var RepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#deleted-repo-tmpl').html()),
        mobileTemplate: _.template($('#deleted-repo-mobile-tmpl').html()),

        events: {
            'click .restore': 'restoreRepo'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            var m = Moment(this.model.get('del_time'));
            var tmpl;
            if ($(window).width() >= 768) {
                tmpl = this.template;
            } else {
                tmpl = this.mobileTemplate;
            }
            _.extend(obj, {
                'icon_url': icon_url,
                'icon_title': this.model.getIconTitle(),
                'time': m.format('LLLL'),
                'time_from_now': Common.getRelativeTimeStr(m)
            });
            this.$el.html(tmpl(obj));
            return this;
        },

        restoreRepo: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({'name': 'deleted_repos'}),
                type: 'POST',
                data: {
                    'repo_id': this.model.get('repo_id')
                },
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    _this.remove();

                    var msg = gettext("Successfully restored library {placeholder}").replace('{placeholder}', _this.model.get('repo_name'));
                    Common.feedback(msg, 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });

            return false;
        }

    });

    return RepoView;
});

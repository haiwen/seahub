define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var AbuseReportView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#abuse-report-item-tmpl').html()),

        events: {
            'click .abuse-report-handle': 'handleReport'
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
            this.listenTo(this.model, "change", this.render);
        },

        render: function() {
            var data = this.model.toJSON(), abuse_type_output,
                icon_size = Common.isHiDPI() ? 48 : 24,
                icon_url = this.model.getIconUrl(icon_size),
                time = Moment(data['time']);

            if (data['abuse_type'] == 'copyright') {
                abuse_type_output = gettext('Copyright infringement');
            } else if (data['abuse_type'] == 'virus') {
                abuse_type_output = gettext('Virus');
            } else if (data['abuse_type'] == 'abuse_content') {
                abuse_type_output = gettext('Abuse content');
            } else if (data['abuse_type'] == 'other') {
                abuse_type_output = gettext('Other');
            }

            data['time'] = time.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(time);
            data['icon_url'] = icon_url;
            data['abuse_type_output'] = abuse_type_output;

            this.$el.html(this.template(data));

            return this;
        },

        handleReport: function() {
            var _this = this, handled_parameter,
                report_id = this.model.get('id'),
                handled = this.model.get('handled');

            if (handled) {
                handled_parameter = false;
            } else {
                handled_parameter = true;
            }

            $.ajax({
                url: Common.getUrl({
                    'name':'admin-abuse-report',
                    'report_id': report_id
                }),
                type: 'PUT',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                data: {
                    'handled': handled_parameter
                },
                success: function() {
                    _this.model.set({'handled': handled_parameter});
                    Common.feedback(gettext("Successfully change the report's status."), 'success');
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            });

            return false;


        }
    });
    return AbuseReportView;
});

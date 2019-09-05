define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/abuse-report'
], function(_, Backbone, Common, AbuseReportModel) {
    'use strict';

    var AbuseReportCollection = Backbone.Collection.extend({
        model: AbuseReportModel,
        url: function () {
            return Common.getUrl({name: 'admin-abuse-reports'});
        },

        parse: function(data) {
            this.data = data.abuse_report_list;
            return data.abuse_report_list;
        }
    });

    return AbuseReportCollection;
});

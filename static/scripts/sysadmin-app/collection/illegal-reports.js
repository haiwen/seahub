define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/illegal-report'
], function(_, Backbone, Common, IllegalReportModel) {
    'use strict';

    var IllegalReportCollection = Backbone.Collection.extend({
        model: IllegalReportModel,
        url: function () {
            return Common.getUrl({name: 'admin-illegal-reports'});
        },

        parse: function(data) {
            this.data = data.illegal_report_list;
            return data.illegal_report_list;
        }
    });

    return IllegalReportCollection;
});

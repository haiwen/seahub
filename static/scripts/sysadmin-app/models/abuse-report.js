define([
    'underscore',
    'backbone',
    'common',
], function(_, Backbone, Common) {
    'use strict';

    var AbuseReportModel = Backbone.Model.extend({

        getIconUrl: function(size) {
            return Common.getLibIconUrl(false, false, size);
        }

    });

    return AbuseReportModel;
});

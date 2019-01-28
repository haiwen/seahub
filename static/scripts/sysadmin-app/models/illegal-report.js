define([
    'underscore',
    'backbone',
    'common',
], function(_, Backbone, Common) {
    'use strict';

    var IllegalReportModel = Backbone.Model.extend({

        getIconUrl: function(size) {
            return Common.getLibIconUrl(false, false, size);
        }

    });

    return IllegalReportModel;
});

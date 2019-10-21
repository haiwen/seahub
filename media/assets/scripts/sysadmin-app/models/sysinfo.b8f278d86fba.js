define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var SysInfo = Backbone.Model.extend({

        url: function () {
            return Common.getUrl({name: 'sysinfo'});
        },

    });

    return SysInfo;
});

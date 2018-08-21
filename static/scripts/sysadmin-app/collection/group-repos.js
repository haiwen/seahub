define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/group-repo'
], function(_, Backbone, Common, GroupRepoModel) {

    'use strict';

    var GroupRepoCollection = Backbone.Collection.extend({

        model: GroupRepoModel,

        setGroupId: function(group_id) {
            this.group_id = group_id;
        },

        parse: function (data) {
            this.group_name= data.group_name;
            return data.libraries; // return the array
        },

        url: function () {
            var url_options = {
                group_id: this.group_id
            };
            if (app.pageOptions.org_id) { // org admin
                $.extend(url_options, {
                    name: 'org-admin-group-libraries',
                    org_id: app.pageOptions.org_id
                });
            } else {
                $.extend(url_options, {
                    name: 'admin-group-libraries'
                });
            }
            return Common.getUrl(url_options);
        }
    });

    return GroupRepoCollection;
});

define([
    'underscore',
    'backbone',
    'common',
    'moment'
], function(_, Backbone, Common, Moment) {
    'use strict';

    var ShareAdminShareLink = Backbone.Model.extend({
        parse: function(response) {
            var attrs = _.clone(response),
                expire_date = response.expire_date;

            if (expire_date) {
                attrs.expire_date_timestamp = Moment(expire_date).format('X');
            } else {
                attrs.expire_date_timestamp = 0;
            }

            return attrs;
        },

        getIconUrl: function(size) {
            if (this.get('is_dir')) {
                return Common.getDirIconUrl(false, size);
            } else {
                return Common.getFileIconUrl(this.get('obj_name'), size);
            }
        },

        getWebUrl: function() {
            var repo_id = this.get('repo_id');
            var dirent_path = this.get('path');

            if (this.get('is_dir')) {
                return "#common/lib/" + repo_id + Common.encodePath(dirent_path);
            } else {
                return app.config.siteRoot + "lib/" + repo_id + "/file" + Common.encodePath(dirent_path);
            }
        }

    });

    return ShareAdminShareLink;
});

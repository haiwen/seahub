define([
    'underscore',
    'backbone'
], function(_, Backbone) {
    'use strict';

    var Repo = Backbone.Model.extend({

        defaults: {
            id: null,
            name: "",
            desc: "",
            mtime: 0,
            mtime_relative: "",
            encrypted: false,
            owner: "-",
            owner_nickname: "-"
        },

        parse: function(response) {
            var attrs = _.clone(response);
            attrs.id = response.id || response.repo_id;
            attrs.name = response.name || response.repo_name;
            attrs.desc = response.desc || response.repo_desc;
            attrs.size_formatted = response.size_formatted || response.repo_size_formatted;
            return attrs;
        },

        validate: function(attrs, options) {
            if (!attrs.name) return gettext("Name is required");

            if (attrs.encrypted) {
                if (!attrs.passwd1) return gettext("Please enter password");
                if (!attrs.passwd2) return gettext("Please enter the password again");
                if (attrs.passwd1.length < app.pageOptions.repo_password_min_length) {
                    return gettext("Password is too short");
                }
                if (attrs.passwd1 != attrs.passwd2) return gettext("Passwords don't match");
            }
        }

    });

    return Repo;
});

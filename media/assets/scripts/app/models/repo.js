define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
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
            owner_nickname: "-",
            storage_name: "-",
            permission: "rw"
        },

        parse: function(response) {
            var attrs = _.clone(response);
            attrs.id = response.id || response.repo_id;
            attrs.storage_name = response.storage_name;
            attrs.name = response.name || response.repo_name;
            attrs.desc = response.desc || response.repo_desc;
            attrs.size_formatted = response.size_formatted || response.repo_size_formatted;
            return attrs;
        },

        validate: function(attrs, options) {
            if (!attrs.name) return gettext("Name is required");

            if (attrs.name.indexOf('/') != -1) {
                return gettext("Name should not include '/'.");
            }

            if (attrs.encrypted) {
                if (!attrs.passwd1) return gettext("Please enter password");
                if (!attrs.passwd2) return gettext("Please enter the password again");
                if (attrs.passwd1.length < app.pageOptions.repo_password_min_length) {
                    return gettext("Password is too short");
                }
                if (attrs.passwd1 != attrs.passwd2) return gettext("Passwords don't match");
            }
        },

        getIconUrl: function(size) {
            var is_encrypted = this.get('encrypted');
            var is_readonly = this.get('permission') == "r" ? true : false;
            return Common.getLibIconUrl(is_encrypted, is_readonly, size);
        },

        getIconTitle: function() {
            return Common.getLibIconTitle({
                'encrypted': this.get('encrypted'),
                'is_admin': this.get('is_admin'),
                'permission': this.get('permission')
            });
        }

    });

    return Repo;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var AdminLogView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#admin-log-item-tmpl').html()),

        events: {
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = {'email': this.model.get('email'),
                        'name': this.model.get('name')
                       },
                created_at = Moment(this.model.get('datetime'));

            data['time'] = created_at.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(created_at);

            var detail = this.model.get('detail');

            var user_url = function(user_id) {
                return app.config.siteRoot + 'useradmin/info/' + encodeURIComponent(user_id) + '/';
            };

            data.admin_user_url = user_url(data.email);

            switch(this.model.get('operation')) {
                case 'repo_create':
                    data.op_title = gettext("Create Library");
                    data.op_details = gettext("Created library {library_name} with {owner} as its owner")
                        .replace('{owner}', '<a href="' + user_url(detail.owner) + '">' + Common.HTMLescape(detail.owner) + '</a>');
                    if (app.pageOptions.is_pro && app.pageOptions.enable_sys_admin_view_repo) {
                        data.op_details = data.op_details.replace('{library_name}', '<a href="#libs/' + encodeURIComponent(detail.id) + '/">' + Common.HTMLescape(detail.name) + '</a>');
                    } else {
                        data.op_details = data.op_details.replace('{library_name}', '<span class="bold" title="' + detail.id + '">' + Common.HTMLescape(detail.name) + '</span>');
                    }
                    break;

                case 'repo_delete':
                    data.op_title = gettext("Delete Library");
                    data.op_details = gettext("Deleted library {library_name}")
                        .replace('{library_name}', '<span class="bold" title="' + detail.id + '">' + Common.HTMLescape(detail.name) + '</span>');
                    break;

                case 'repo_transfer':
                    data.op_title = gettext("Transfer Library");
                    data.op_details = gettext("Transferred library {library_name} from {user_from} to {user_to}")
                        .replace('{user_from}', '<a href="' + user_url(detail.from) + '">' + Common.HTMLescape(detail.from) + '</a>')
                        .replace('{user_to}', '<a href="' + user_url(detail.to) + '">' + Common.HTMLescape(detail.to) + '</a>');
                    if (app.pageOptions.is_pro && app.pageOptions.enable_sys_admin_view_repo) {
                        data.op_details = data.op_details.replace('{library_name}', '<a href="#libs/' + encodeURIComponent(detail.id) + '/">' + Common.HTMLescape(detail.name) + '</a>');
                    } else {
                        data.op_details = data.op_details.replace('{library_name}', '<span class="bold" title="' + detail.id + '">' + Common.HTMLescape(detail.name) + '</span>');
                    }
                    break;

                case 'group_create':
                    data.op_title = gettext("Create Group");
                    data.op_details = gettext("Created group {group_name}").replace('{group_name}', '<a href="#groups/' + encodeURIComponent(detail.id) + '/">' + Common.HTMLescape(detail.name) + '</a>');
                    break;

                case 'group_transfer':
                    data.op_title = gettext("Transfer Group");
                    data.op_details = gettext("Transferred group {group_name} from {user_from} to {user_to}")
                        .replace('{group_name}', '<a href="#groups/' + encodeURIComponent(detail.id) + '/">' + Common.HTMLescape(detail.name) + '</a>')
                        .replace('{user_from}', '<a href="' + user_url(detail.from) + '">' + Common.HTMLescape(detail.from) + '</a>')
                        .replace('{user_to}', '<a href="' + user_url(detail.to) + '">' + Common.HTMLescape(detail.to) + '</a>');
                    break;

                case 'group_delete':
                    data.op_title = gettext("Delete Group");
                    data.op_details = gettext("Deleted group {group_name}")
                        .replace('{group_name}', '<span class="bold" title="' + detail.id + '">' + Common.HTMLescape(detail.name) + '</span>');
                    break;

                case 'user_add':
                    data.op_title = gettext("Add User");
                    data.op_details = gettext("Added user {user}")
                        .replace('{user}', '<a href="' + user_url(detail.email) + '">' + Common.HTMLescape(detail.email) + '</a>');
                    break;

                case 'user_delete':
                    data.op_title = gettext("Delete User");
                    data.op_details = gettext("Deleted user {user}")
                        .replace('{user}', '<span class="bold">' + Common.HTMLescape(detail.email) + '</span>');
                    break;
            }

            this.$el.html(this.template(data));

            return this;
        }

    });

    return AdminLogView;
});

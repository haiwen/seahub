define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'app/views/widgets/hl-item-view'
], function($, _, Backbone, Common, Moment, HLItemView) {
    'use strict';

    var AdminLoginLogView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#admin-login-log-item-tmpl').html()),

        events: {
        },

        initialize: function() {
            HLItemView.prototype.initialize.call(this);
        },

        render: function() {
            var data = {
                    'email': this.model.get('email'),
                    'name': this.model.get('name'),
                    'login_ip': this.model.get('login_ip'),
                    'login_success': this.model.get('login_success')
                },
                login_time = Moment(this.model.get('login_time'));

            data['time'] = login_time.format('LLLL');
            data['time_from_now'] = Common.getRelativeTimeStr(login_time);

            var user_url = function(user_id) {
                return app.config.siteRoot + 'useradmin/info/' + encodeURIComponent(user_id) + '/';
            };

            data.admin_user_url = user_url(data.email);

            this.$el.html(this.template(data));

            return this;
        }

    });

    return AdminLoginLogView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var AllGroupsRepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#all-groups-repo-tr-tmpl').html()),

        initialize: function(date) {
            this.repo = date['repo'];
            this.group_id = date['group_id'];
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .cancel-share': 'unshare'
        },

        highlight: function(e) {
            this.$el.addClass('hl').find('.op-icon').removeClass('vh');
        },

        rmHighlight: function(e) {
            this.$el.removeClass('hl').find('.op-icon').addClass('vh');
        },

        render: function() {
            var json_data = this.repo;
            json_data['is_staff'] = app.pageOptions.is_staff;
            json_data['group_id'] = this.group_id;
            this.$el.html(this.template(json_data));
            return this;
        },

        unshare: function(e) {
            var repo_name = this.repo['repo_name'],
                repo_id = this.repo['repo_id'],
                group_id = this.group_id,
                this_tr = $(e.currentTarget).closest('tr'),
                this_tbody = this_tr.parent();

            $.ajax({
                url: Common.getUrl({name: 'group_repos', group_id: group_id}) + repo_id,
                type: 'DELETE',
                wait: true,
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    var msg = gettext('Successfully unshared {placeholder}').replace('{placeholder}', '<span class="op-target">' + Common.HTMLescape(repo_name) + '</span>');

                    Common.feedback(msg, 'success', Common.SUCCESS_TIMOUT);
                    this_tr.remove();
                    if (!this_tbody.children().length) {
                        this_tbody.append('<tr><td colspan=6 class="no-repos">' + gettext('No library is shared to this group') + '</td></tr>');
                    }
                },
                error: function(model, response) {
                    var err;
                    if (response.responseText) {
                        err = $.parseJSON(response.responseText).error_msg;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err, 'error');
                }
            });
        }

    });

    return AllGroupsRepoView;
});

define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/details-item'
], function($, _, Backbone, Common, DetailsItemView) {
    'use strict';

    var DetailsView = Backbone.View.extend({

        id: 'ls-ch',

        template: _.template($('#details-popup-tmpl').html()),

        initialize: function (options) {
            this.repo_id = options['repo_id'];
            this.cmmt_id = options['cmmt_id'];

            this.$el.html(this.template()).modal({autoResize:true});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.getDetails();
        },

        getDetails: function () {
            var repo_id = this.repo_id,
                cmmt_id = this.cmmt_id,
                details_title,
                _this = this;

            Common.ajaxGet({
                get_url: Common.getUrl({ name:'get_history_changes', repo_id: repo_id}),
                data: {'commit_id': cmmt_id},
                after_op_success: function (data) {
                    _this.$('.loading-tip').hide();
                    _this.$('.commit-time').html(data['date_time']);

                    for (var item in data) {
                        if (data[item].length > 0 && item != 'date_time') {
                            if (item == "new") { details_title = gettext("New files") }
                            if (item == "removed") { details_title = gettext("Deleted files") }
                            if (item == "renamed") { details_title = gettext("Renamed or Moved files") }
                            if (item == "modified") { details_title = gettext("Modified files") }
                            if (item == "newdir") { details_title = gettext("New directories") }
                            if (item == "deldir") { details_title = gettext("Deleted directories") }

                            var view = new DetailsItemView({details_title: details_title, details: data[item]});
                            _this.$el.append(view.render().el);
                        }
                    }
                    $(window).resize();
                },
                after_op_error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        }
    });

    return DetailsView;
})

define([
    'jquery',
    'underscore',
    'backbone',
    'common'
], function($, _, Backbone, Common) {
    'use strict';

    var DetailsView = Backbone.View.extend({

        id: 'ls-ch',

        template: _.template($('#details-popup-tmpl').html()),
        detailItemTemplate: _.template($('#detail-item-tmpl').html()),

        initialize: function (options) {
            this.repo_id = options['repo_id'];
            this.cmmt_id = options['cmmt_id'];

            this.$el.html(this.template()).modal({autoResize:true});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.getDetails();
        },

        getDetails: function () {
            var _this = this;

            Common.ajaxGet({
                get_url: Common.getUrl({
                    name:'get_history_changes',
                    repo_id: this.repo_id
                }),
                data: {'commit_id': this.cmmt_id},
                after_op_success: function (data) {
                    _this.$('.loading-tip').hide();
                    _this.$('.commit-time').html(data['date_time']);

                    var showDetails = function(params) {
                        _this.$el.append(_this.detailItemTemplate({
                            "details_title": params.title,
                            "details": params.content
                        }));
                    };
                    if (data['new'].length > 0) {
                        showDetails({
                            'title': gettext("New files"),
                            'content': data['new']
                        });
                    }
                    if (data['removed'].length > 0) {
                        showDetails({
                            'title': gettext("Deleted files"),
                            'content': data['removed']
                        });
                    }
                    if (data['renamed'].length > 0) {
                        showDetails({
                            'title': gettext("Renamed or Moved files"),
                            'content': data['renamed']
                        });
                    }
                    if (data['modified'].length > 0) {
                        showDetails({
                            'title': gettext("Modified files"),
                            'content': data['modified']
                        });
                    }
                    if (data['newdir'].length > 0) {
                        showDetails({
                            'title': gettext("New directories"),
                            'content': data['newdir']
                        });
                    }
                    if (data['deldir'].length > 0) {
                        showDetails({
                            'title': gettext("Deleted directories"),
                            'content': data['deldir']
                        });
                    }

                    // most of the time, no 'cmt_desc'
                    if (data['cmt_desc']) {
                        _this.$el.append('<p>' + Common.HTMLescape(data['cmt_desc']) + '</p>');
                    }

                    $(window).trigger('resize');
                },
                after_op_error: function(xhr) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$el.html('<p class="error">' + error_msg + '</p>');
                    setTimeout(function() { $.modal.close(); }, 2500);
                }
            });
        }
    });

    return DetailsView;
})

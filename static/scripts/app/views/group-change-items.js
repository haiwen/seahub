define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'text!' + app.config._tmplRoot + 'group-change-item.html'
], function($, _, Backbone, Common, changeItemTemplate) {
    'use strict';

    var GroupChangeItemView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(changeItemTemplate),

        events: {
            'click .lsch': 'showDetail'
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        showDetail: function() {
            console.log(this.model);

            // TODO: if repo is encrypted, and not set password, show decrypt
            // form, else show details

            var model = this.model;
            var url = app.config.siteRoot + 'ajax/repo/' + model.get("repo").id + '/history/changes/' + "?commit_id=" + model.get("id");
            var loadingHtml = '<div id="ls-ch"><img src="'+ app.config.mediaUrl + 'img/loading-icon.gif" alt="" style="margin-top:30px;" /></div>';
            $.modal(loadingHtml, {autoResize:true});
            $('#ls-ch').css('text-align', 'center');
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function(data) {
                    var heading = '<h3>' + "Modification Details" + '</h3>';
                    var time = '<p class="commit-time">' + model.get("ctime") + '</p>';
                    var con = '';
                    function show(data_, hd) {
                        if (data_.length > 0) {
                            con += '<h4>' + hd + '</h4>';
                            con += '<ul>';
                            for (var i = 0, len = data_.length; i < len; i++) {
                                con += '<li>' + data_[i] + '</li>';
                            }
                            con += '</ul>';
                        }
                    }
                    show(data['new'], "New files");
                    show(data['removed'], "Deleted files");
                    show(data['renamed'], "Renamed or Moved files");
                    show(data['modified'], "Modified files");
                    show(data['newdir'], "New directories");
                    show(data['deldir'], "Deleted directories");
                    if (!con) {
                        if (data['cmt_desc']) {
                            con = '<p>' + Common.HTMLescape(data['cmt_desc']) + '</p>';
                        }
                    }
                    $('#ls-ch').css('text-align','left').html(heading + time + con);
                    $(window).resize();
                },
                error: function() {
                    $('#ls-ch').html("Unknown error.");
                    setTimeout(function() { $.modal.close(); }, 2500);
                }
            });




        }
    });

    return GroupChangeItemView;
});

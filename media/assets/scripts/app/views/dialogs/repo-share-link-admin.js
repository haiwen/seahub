define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'jquery.ui', /* for tabs */
    'app/collections/repo-shared-download-links',
    'app/collections/repo-shared-upload-links',
    'app/views/repo-shared-link'
], function($, _, Backbone, Common, jQueryUI, DownloadLinks, UploadLinks, LinkView) {
    'use strict';

    var RepoShareLinkAdminDialog = Backbone.View.extend({
        tagName: 'div',
        id: 'repo-share-link-admin-dialog',
        template: _.template($('#repo-shared-links-admin-dialog-tmpl').html()),

        initialize: function(options) {
            this.repo_name = options.repo_name;
            this.repo_id = options.repo_id;

            this.render();
            this.$('.op-target').css({'max-width':280}); // for long repo name

            if ($(window).width() >= 768) {
                this.$el.modal({focus: false});
                $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            } else {
                this.$el.css({
                    'width': $(window).width() - 50,
                    'height': $(window).height() - 50,
                    'overflow': 'auto'
                }).modal({focus:false});
            }

            this.$('.js-tabs').tabs();

            var downloadLinks = new DownloadLinks({repo_id: this.repo_id});
            downloadLinks.link_type = 'download';
            this.$downloadLinksPanel = this.$('#js-download-links');

            var uploadLinks = new UploadLinks({repo_id: this.repo_id});
            uploadLinks.link_type = 'upload';
            this.$uploadLinksPanel = this.$('#js-upload-links');

            if (app.pageOptions.can_generate_share_link) {
                this.renderLinksPanel({
                    links: downloadLinks,
                    $panel: this.$downloadLinksPanel
                });
            }

            if (app.pageOptions.can_generate_upload_link) {
                this.renderLinksPanel({
                    links: uploadLinks,
                    $panel: this.$uploadLinksPanel
                });
            }
        },

        render: function() {
            this.$el.html(this.template({
                can_generate_share_link: app.pageOptions.can_generate_share_link,
                can_generate_upload_link: app.pageOptions.can_generate_upload_link,
                title: gettext("{placeholder} Share Links")
                    .replace('{placeholder}',
                    '<span class="op-target ellipsis ellipsis-op-target" title="'
                    + Common.HTMLescape(this.repo_name) + '">'
                    + Common.HTMLescape(this.repo_name) + '</span>')
            }));

            return this;
        },

        renderLinksPanel: function(options) {
            var links = options.links;
            var $panel = options.$panel;
            var $loadingTip = $('.loading-tip', $panel);
            var $error = $('.error', $panel);

            this.listenTo(links, 'add', this.addLink);
            links.fetch({
                cache: false,
                success: function(collection, response, opts) {
                    $loadingTip.hide();
                },
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                    $loadingTip.hide();
                }
            });
        },

        addLink: function(model, collection, options) {
            var link_type = collection.link_type;
            var $panel = link_type == 'download' ? this.$downloadLinksPanel : this.$uploadLinksPanel;
            var view = new LinkView({
                model: model,
                repo_id: this.repo_id,
                link_type: link_type,
                $error: $('.error', $panel)
            });
            $('tbody', $panel).append(view.render().el);
        }

    });

    return RepoShareLinkAdminDialog;
});

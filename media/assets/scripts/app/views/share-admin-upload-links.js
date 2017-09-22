define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/share-admin-upload-links',
    'app/views/share-admin-upload-link'
], function($, _, Backbone, Common, ShareAdminUploadLinkCollection,
    ShareAdminUploadLinkView) {

    'use strict';

    var ShareAdminUploadLinksView = Backbone.View.extend({

        id: 'share-admin-upload-links',

        template: _.template($('#share-admin-upload-links-tmpl').html()),

        initialize: function() {
            this.links = new ShareAdminUploadLinkCollection();
            this.listenTo(this.links, 'add', this.addOne);
            this.listenTo(this.links, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.html(this.template({'can_generate_share_link': app.pageOptions.can_generate_share_link}));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showContent();
        },

        showContent: function() {
            var _this = this;
            this.initPage();
            this.links.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                    var $error = _this.$('.error');
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).show();
                }
            });
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$('.error').hide();
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.links.length) {
                this.$emptyTip.hide();
                this.$tableBody.empty();
                this.links.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        addOne: function(link) {
            var view = new ShareAdminUploadLinkView({model: link});
            this.$tableBody.append(view.render().el);
        }

    });

    return ShareAdminUploadLinksView;
});

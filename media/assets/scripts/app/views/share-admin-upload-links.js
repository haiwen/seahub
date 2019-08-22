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

        el: '.main-panel',

        template: _.template($('#share-admin-upload-links-tmpl').html()),

        initialize: function() {
            this.links = new ShareAdminUploadLinkCollection();
            this.listenTo(this.links, 'add', this.addOne);
            this.listenTo(this.links, 'reset', this.reset);
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="share-admin-upload-links"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        hide: function() {
            this.$mainCon.detach();
        },

        show: function() {
            this.renderMainCon();
            this.showContent();
        },

        showContent: function() {
            var _this = this;
            this.initPage();
            this.links.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var $error = _this.$('.error');
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    $error.html(err_msg).show();
                    _this.$loadingTip.hide();
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

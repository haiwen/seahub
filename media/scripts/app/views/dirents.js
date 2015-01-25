define([
    'jquery',
    'underscore',
    'backbone',
    'text!' + app.config._tmplRoot + 'dirent.html'
], function($, _, Backbone, direntsTemplate) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(direntsTemplate),

        initialize: function(options) {
            console.log('init DirentView');
            this.options = options || {};
            this.model = options.model;
            this.dirView = options.dirView;

            app.globalState.noFileOpPopup = true;
            this.listenTo(this.model, "change", this.render);
            //Backbone.View.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            this.$el.html(this.template({
              dirent: this.model.attributes,
              repo_id: this.dirView.dir.repo_id,
              path: this.dirView.dir.path,
              user_perm: this.dirView.dir.user_perm,
              repo_encrypted: this.dirView.dir.encrypted
            }));
            return this;
        },

        events: {
          'mouseenter': 'highlight',
          'mouseleave': 'rmHighlight',
          'click .select': 'select',
          'click .file-star': 'starFile',
          'click .dir-link': 'visitDir',
          'click .more-op-icon': 'togglePopup',
          'click .share': 'share',
          'click .del': 'delete',
          'click .rename': 'rename',
          'click .mv': 'mvcp',
          'click .cp': 'mvcp',
          'click .file-update': 'updateFile'
        },

        highlight: function() {
          if (app.globalState.noFileOpPopup) {
            this.$el.addClass('hl').find('.repo-file-op').removeClass('vh');
          }
        },

        rmHighlight: function() {
          if (app.globalState.noFileOpPopup) {
            this.$el.removeClass('hl').find('.repo-file-op').addClass('vh');
          }
        },

    });

    return DirentView;
});

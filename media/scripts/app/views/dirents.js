define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'text!' + app.config._tmplRoot + 'dirent.html'
], function($, _, Backbone, Common, direntsTemplate) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(direntsTemplate),

        initialize: function(options) {
            this.options = options || {};
            this.model = options.model;
            this.dirView = options.dirView;

            app.globalState.noFileOpPopup = true;
            this.listenTo(this.model, "change", this.render);
            //Backbone.View.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            var dirent_path = Common.pathJoin([this.dirView.dir.path,
              this.model.attributes.obj_name]);
            //console.log(Common.pathJointhis.dirView.dir.path + "/" + this.model.attributes.obj_name);
            this.$el.html(this.template({
              dirent: this.model.attributes,
              repo_id: this.dirView.dir.repo_id,
              path: this.dirView.dir.path,
              dirent_path: dirent_path,
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

        select: function () {
          var checkbox = this.$('.checkbox');
          checkbox.toggleClass('checkbox-checked');
          if (checkbox.hasClass('checkbox-checked')) {
            this.model.set({'selected':true}, {silent:true}); // do not trigger the 'change' event.
          } else {
            this.model.set({'selected':false}, {silent:true});
          }

        },

        starFile: function() {
          var _this = this;
          var dir = this.dirView.dir;
          //var path = dir.path;
          //path += (path == '/' ? '' : '/');
          var starred = this.model.get('starred');
          var options = { repo_id: dir.repo_id };
          options.name = starred ? 'unstar_file' : 'star_file';
          var filePath = Common.pathJoin([dir.path, this.model.get('obj_name')]);
          var url = Common.getUrl(options) + '?file=' + encodeURIComponent(filePath);
          $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            success: function () {
              if (starred) {
                _this.model.set({'starred':false});
              } else {
                _this.model.set({'starred':true});
              }
            },
            error: Common.ajaxErrorHandler
          });
        },

        visitDir: function () {
          // show 'loading'
          this.$('.dirent-icon img').attr({
            'src': app.config.mediaURL + 'img/loading-icon.gif',
            'alt':''
          });
          // empty all models
          this.dirView.dir.reset();
          // update url & dirents
          var dir_url = this.$('.dir-link').attr("href");
          app.router.navigate(dir_url, {trigger: true}); // offer an url fragment
          return false;
        },

        togglePopup: function () {
          var icon = this.$('.more-op-icon'),
            popup = this.$('.hidden-op');

          if (popup.hasClass('hide')) { // the popup is not shown
            if (icon.position().left + icon.width() + popup.outerWidth() < icon.parent().width()) {
              popup.css({'left': icon.position().left + icon.width() + 5});
              if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                popup.css('top', 6);
              } else {
                popup.css('bottom', 2);
              }
            } else {
              popup.css({'right':0});
              if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                popup.css('top', icon.position().top + icon.height() + 3);
              } else {
                popup.css('bottom', icon.position().top + icon.height() + 3);
              }
            }
            popup.removeClass('hide');
            app.globalState.noFileOpPopup = false;
            app.globalState.popup_tr = icon.parents('tr');
          } else {
            popup.addClass('hide');
            app.globalState.noFileOpPopup = true;
            app.globalState.popup_tr = '';
          }
        },

    });

    return DirentView;
});

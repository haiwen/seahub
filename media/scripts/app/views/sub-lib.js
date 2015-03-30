define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/share',
    'text!' + app.config._tmplRoot + 'sub-lib.html'
], function($, _, Backbone, Common, ShareView, reposTemplate) {
    'use strict';

    var RepoView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template(reposTemplate),

        events: {
            'mouseenter': 'showAction',
            'mouseleave': 'hideAction',
            'click .repo-delete-btn': 'delete',
            'click .repo-share-btn': 'share'
        },

        initialize: function() {
            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        showAction: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideAction: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
        },

        showDelConfirm: function($target, msg, yesCallback) {
            // TODO: need to refactor, copied from repo_del_js.html

            var op = $target,
                cont = op.parent().css({'position': 'relative'}),
                cfm;

            // only show 1 popup each time.
            $('.repo-del-cfm', op.parents('table')).addClass('hide');

            if (cont.find('.repo-del-cfm').length == 1) {
                cfm = cont.find('.repo-del-cfm');
            } else {
                cfm = $('#repo-del-cfm-popup').clone().removeAttr('id');
                cont.append(cfm);
                cfm.css({'left': op.position().left, 'top': op.position().top + op.height() + 2, 'width':202});
            }

            var con = $('.con', cfm);
            con.html(msg.replace('{placeholder}', '<span class="op-target">' + this.model.get("name") + '</span>'));
            cfm.removeClass('hide');
            $('.no',cfm).click(function() {
                cfm.addClass('hide');
            });

            $('.yes', cfm).click(yesCallback);
        },

        delete: function(e) {
            e.preventDefault();

            var that = this;
            var yesCallback = function() {
                Common.feedback(gettext('Loading...'), 'info', Common.INFO_TIMEOUT); // TODO: what if there is still response after 10 secs ?
                that.model.destroy({
                    wait: true,
                    success: function(model, rep) {
                        Common.feedback(gettext('Delete succeeded'), 'success', Common.SUCCESS_TIMOUT);
                    },
                    error: function() {
                        Common.feedback(gettext('Error'), 'error', Common.ERROR_TIMEOUT);
                    }
                });
            }

            this.showDelConfirm(
                $(e.target),
                gettext('Really want to delete {placeholder} ?')
                    .replace(/\{placeholder\}/g, '<span class="op-target">' + this.model.get('name') + '</span>'),
                yesCallback
            );
        },

        share: function() {
            var options = {
                'is_repo_owner': true,
                'is_virtual': this.model.get('virtual'),
                'user_perm': this.model.get('permission'),
                'repo_id': this.model.get('id'),
                'is_dir': true,
                'dirent_path': '/',
                'obj_name': this.model.get('name')
            };
            new ShareView(options);
        }

    });

    return RepoView;
});

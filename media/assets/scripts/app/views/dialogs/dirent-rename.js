define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    var DirentRenameDialog = Backbone.View.extend({

        template: _.template($("#dirent-rename-dialog-template").html()),

        initialize: function(options) {
            this.dirent = options.dirent;
            this.dir = options.dir;

            this.dirView = options.dirView;
            this.imgIndex = options.imgIndex;

            this.render();
            this.$el.modal({focus: false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            var $input = this.$('[name="newname"]');
            var dot_index = this.dirent.get('obj_name').lastIndexOf('.');
            if (!this.dirent.get('is_dir') && dot_index != -1) {
                $input.trigger('focus');
                $input[0].setSelectionRange(0, dot_index);
            } else {
                $input.trigger('select');
            }

            this.$error = this.$('.error');
            this.$form = this.$('form');
        },

        render: function() {
            var title = this.dirent.get('is_dir') ?
                gettext("Rename Folder") : gettext("Rename File");

            this.$el.html(this.template({
                form_title: title,
                dirent_name: this.dirent.get('obj_name')
            }));

            return this;
        },

        events: {
            'submit form': 'formSubmit'
        },

        formSubmit: function() {
            var _this = this;
            var new_name = $.trim(this.$('[name="newname"]').val());
            var err_msg;

            if (!new_name) {
                err_msg = gettext("It is required.");
                this.$error.html(err_msg).removeClass('hide');
                return false;
            }

            if (new_name.indexOf('/') != -1) {
                err_msg = gettext("Name should not include '/'.");
                this.$error.html(err_msg).removeClass('hide');
                return false;
            }

            if (new_name == this.dirent.get('obj_name')) {
                $.modal.close();
                return false;
            }

            var $submit_btn = this.$('[type="submit"]');
            Common.disableButton($submit_btn);

            this.dirent.rename({
                newname: new_name,
                success: function() {
                    $.modal.close();

                    if (_this.dirent.get('is_img')) {
                        _this.dirView.updateMagnificPopupOptions({
                            'op': 'update-item',
                            'index': _this.imgIndex,
                            'model': _this.dirent
                        });
                    }
                },
                error: function(xhr, textStatus, errorThrown) {
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$error.html(error_msg).removeClass('hide');
                    Common.enableButton($submit_btn);
                }
            });
            return false;
        }

    });

    return DirentRenameDialog;
});

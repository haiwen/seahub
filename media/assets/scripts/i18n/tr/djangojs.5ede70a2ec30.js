

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n > 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "Are you sure you want to clear trash?": "\u00c7\u00f6p tenekesini bo\u015faltmak istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete %s ?": "%s'i silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete %s completely?": "%s'i tamamen silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete all %s's libraries?": "%s'e ait t\u00fcm k\u00fct\u00fcphaneleri silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete these selected items?": "Se\u00e7ili \u00f6\u011feleri silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to quit this group?": "Gruptan \u00e7\u0131kmak istedi\u011finize emin misiniz?", 
    "Are you sure you want to restore %s?": "%s'i yeniden y\u00fcklemek istedi\u011finize emin misiniz?", 
    "Are you sure you want to unshare %s ?": "%s payla\u015f\u0131m\u0131n\u0131 kald\u0131rmak istedi\u011finize emin misiniz?", 
    "Cancel": "\u0130ptal", 
    "Canceled.": "\u0130ptal edildi.", 
    "Clear Trash": "\u00c7\u00f6p Tenekesini Bo\u015falt", 
    "Close (Esc)": "Kapat (Esc)", 
    "Copying %(name)s": "%(name)s kopyalan\u0131yor.", 
    "Copying file %(index)s of %(total)s": "%(total)s i\u00e7inden %(index)s dosyas\u0131 kopyalan\u0131yor", 
    "Delete": "Sil", 
    "Delete Group": "Grubu Sil", 
    "Delete Items": "\u00d6\u011feleri sil", 
    "Delete Library": "K\u00fct\u00fcphaneyi Sil", 
    "Delete Library By Owner": "Sahibine g\u00f6re k\u00fct\u00fcphane sil", 
    "Delete Member": "\u00dcyeyi Sil", 
    "Delete User": "Kullan\u0131c\u0131y\u0131 sil", 
    "Deleted directories": "Silinmi\u015f dizinler", 
    "Deleted files": "Silinmi\u015f Dosyalar", 
    "Dismiss Group": "Grubu Sonland\u0131r", 
    "Edit Page": "Sayfay\u0131 D\u00fczenle", 
    "Empty file upload result": "Bo\u015f dosya y\u00fckleme sonucu", 
    "Error": "Hata", 
    "Failed to send to {placeholder}": "{placeholder}'a g\u00f6nderilemedi", 
    "Failed.": "Ba\u015far\u0131s\u0131z.", 
    "Failed. Please check the network.": "Ba\u015far\u0131s\u0131z oldu. L\u00fctfen a\u011f\u0131 kontrol edin.", 
    "File Upload canceled": "Dosya Y\u00fckleme iptal edildi", 
    "File Upload complete": "Dosya Y\u00fckleme tamamland\u0131", 
    "File Upload failed": "Dosya Y\u00fckleme Ba\u015far\u0131s\u0131z", 
    "File Uploading...": "Dosyay\u0131 Y\u00fckl\u00fcyor...", 
    "File is locked": "Dosya kilitli", 
    "File is too big": "Dosya \u00e7ok b\u00fcy\u00fck", 
    "File is too small": "Dosya \u00e7ok k\u00fc\u00e7\u00fck", 
    "Filetype not allowed": "Dosya tipine izin verilmiyor.", 
    "Internal error. Failed to copy %(name)s.": "\u0130\u00e7 hata. %(name)s kopyalama ba\u015far\u0131s\u0131z.", 
    "Internal error. Failed to move %(name)s.": "\u0130\u00e7 hata. %(name)s ta\u015f\u0131ma ba\u015far\u0131s\u0131z.", 
    "Invalid destination path": "Ge\u00e7ersiz hedef yolu", 
    "It is required.": "Gerekli.", 
    "Just now": "\u015eu anda", 
    "Last Update": "En son G\u00fcncelleme", 
    "Loading...": "Y\u00fckleniyor...", 
    "Log out": "\u00c7\u0131k\u0131\u015f yap", 
    "Modified files": "De\u011fi\u015ftirilmi\u015f dosyalar", 
    "Moving %(name)s": "%(name)s ta\u015f\u0131n\u0131yor.", 
    "Moving file %(index)s of %(total)s": "%(total)s i\u00e7inden %(index)s dosyas\u0131 ta\u015f\u0131n\u0131yor.", 
    "Name": "\u0130sim", 
    "Name is required": "\u0130sim gerekli", 
    "Name is required.": "\u0130sim gerekli.", 
    "New File": "Yeni Dosya", 
    "New Folder": "Yeni Klas\u00f6r", 
    "New directories": "Yeni dizinler", 
    "New files": "Yeni Dosyalar", 
    "New password is too short": "Yeni \u015fifre \u00e7ok k\u0131sa", 
    "New passwords don't match": "Yeni \u015fifreler e\u015fle\u015fmiyor", 
    "Next (Right arrow key)": "Sonraki (Sa\u011f ok tu\u015fu)", 
    "Only an extension there, please input a name.": "Sadece uzant\u0131 var, l\u00fctfen bir isim giriniz.", 
    "Open in New Tab": "Yeni bir Sekmede A\u00e7", 
    "Pages": "Sayfalar", 
    "Password is required.": "\u015eifre gerekli.", 
    "Password is too short": "\u015eifre \u00e7ok k\u0131sa", 
    "Passwords don't match": "\u015eifreler e\u015fle\u015fmiyor.", 
    "Please check the network.": "L\u00fctfen a\u011f\u0131 kontrol edin.", 
    "Please choose a CSV file": "L\u00fctfen bir CVS dosyas\u0131 se\u00e7iniz", 
    "Please click and choose a directory.": "L\u00fctfen t\u0131klay\u0131n ve bir dizin se\u00e7in.", 
    "Please enter password": "L\u00fctfen \u015fifre giriniz", 
    "Please enter the new password again": "L\u00fctfen yeni \u015fifreyi tekrar giriniz", 
    "Please enter the old password": "L\u00fctfen eski \u015fifreyi giriniz", 
    "Please enter the password again": "L\u00fctfen \u015fifreyi tekrar giriniz.", 
    "Please enter valid days": "L\u00fctfen ge\u00e7erli g\u00fcnler girin", 
    "Please input at least an email.": "L\u00fctfen en az bir eposta giri\u015fi yap\u0131n", 
    "Previous (Left arrow key)": "\u00d6nceki (Sol ok tu\u015fu)", 
    "Processing...": "\u0130\u015fleniyor...", 
    "Quit Group": "Gruptan \u00c7\u0131k", 
    "Read-Only": "Salt okunur", 
    "Read-Write": "Okuma-Yazma", 
    "Really want to dismiss this group?": "Bu grubu sonland\u0131rmay\u0131 ger\u00e7ekten istiyor musunuz?", 
    "Rename": "Yeniden Adland\u0131r", 
    "Rename File": "Dosyay\u0131 yeniden adland\u0131r", 
    "Renamed or Moved files": "Yeniden Adland\u0131r\u0131lm\u0131\u015f ya da Ta\u015f\u0131nm\u0131\u015f Dosyalar", 
    "Restore Library": "K\u00fct\u00fcphaneyi Geri Y\u00fckle", 
    "Saving...": "Kaydediliyor...", 
    "Search files in this wiki": "Dosyalar\u0131 bu wikide ara", 
    "Select groups": "Grup se\u00e7in", 
    "Settings": "Ayarlar", 
    "Show": "G\u00f6ster", 
    "Size": "Boyut", 
    "Start": "Ba\u015fla", 
    "Submit": "G\u00f6nder", 
    "Success": "Ba\u015far\u0131l\u0131", 
    "Successfully copied %(name)s": "%(name)s ba\u015far\u0131yla kopyaland\u0131", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla kopyaland\u0131.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s ve 1 di\u011fer \u00f6\u011fe ba\u015far\u0131yla kopyaland\u0131.", 
    "Successfully copied %(name)s.": "%(name)s ba\u015far\u0131yla kopyaland\u0131.", 
    "Successfully deleted %(name)s": "%(name)s ba\u015far\u0131yla tamamland\u0131.", 
    "Successfully deleted %(name)s and %(amount)s other items.": " %(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla silindi.", 
    "Successfully deleted %(name)s.": "%(name)s ba\u015far\u0131yla silindi.", 
    "Successfully moved %(name)s": "%(name)s ba\u015far\u0131yla ta\u015f\u0131nd\u0131", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla ta\u015f\u0131nd\u0131.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s ve 1 di\u011fer \u00f6\u011fe ba\u015far\u0131yla ta\u015f\u0131nd\u0131.", 
    "Successfully moved %(name)s.": "%(name)s ba\u015far\u0131yla ta\u015f\u0131nd\u0131.", 
    "Successfully sent to {placeholder}": "{placeholder}'a g\u00f6nderildi", 
    "System Admin": "Sistem Y\u00f6neticisi", 
    "Transfer Library": "K\u00fct\u00fcphaneyi transfer et", 
    "Unshare Library": "K\u00fct\u00fcphane payla\u015f\u0131m\u0131n\u0131 kald\u0131r", 
    "Uploaded bytes exceed file size": "Y\u00fcklenen baytlar dosya boyutunu a\u015f\u0131yor.", 
    "Used": "Kullan\u0131lan", 
    "canceled": "iptal edildi", 
    "uploaded": "y\u00fcklendi"
  };
  for (var key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      var value = django.catalog[msgid];
      if (typeof(value) == 'undefined') {
        return msgid;
      } else {
        return (typeof(value) == 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      var value = django.catalog[singular];
      if (typeof(value) == 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value[django.pluralidx(count)];
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      var value = django.gettext(context + '\x04' + msgid);
      if (value.indexOf('\x04') != -1) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      var value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.indexOf('\x04') != -1) {
        value = django.ngettext(singular, plural, count);
      }
      return value;
    };

    django.interpolate = function(fmt, obj, named) {
      if (named) {
        return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
      } else {
        return fmt.replace(/%s/g, function(match){return String(obj.shift())});
      }
    };


    /* formatting library */

    django.formats = {
    "DATETIME_FORMAT": "d F Y H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "d F Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%y-%m-%d", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "d F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d M Y H:i", 
    "SHORT_DATE_FORMAT": "d M Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F Y"
  };

    django.get_format = function(format_type) {
      var value = django.formats[format_type];
      if (typeof(value) == 'undefined') {
        return format_type;
      } else {
        return value;
      }
    };

    /* add to global namespace */
    globals.pluralidx = django.pluralidx;
    globals.gettext = django.gettext;
    globals.ngettext = django.ngettext;
    globals.gettext_noop = django.gettext_noop;
    globals.pgettext = django.pgettext;
    globals.npgettext = django.npgettext;
    globals.interpolate = django.interpolate;
    globals.get_format = django.get_format;

    django.jsi18n_initialized = true;
  }

}(this));


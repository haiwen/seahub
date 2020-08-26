

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
    "(current notification)": "(\u015eu anki bildirim)",
    "(current version)": "(ge\u00e7erli versiyon)",
    "1 month ago": "1 ay \u00f6nce",
    "1 week ago": "1 hafta \u00f6nce",
    "3 days ago": "3 g\u00fcn \u00f6nce",
    "A file with the same name already exists in this folder.": "Bu klas\u00f6rde ayn\u0131 isimde bir dosya zaten var.",
    "About Us": "Hakk\u0131m\u0131zda",
    "Active": "Aktif",
    "Activities": "Etkinlikler",
    "Add": "Ekle",
    "Add Admins": "Y\u00f6netici Ekle",
    "Add Library": "K\u00fct\u00fcphane ekle",
    "Add admin": "Y\u00f6netici ekle",
    "Add auto expiration": "Otomatik sona erme ekle",
    "Add new notification": "Yeni bildirim ekle",
    "Add password protection": "\u015eifre koruma ekle",
    "Add user": "Kullan\u0131c\u0131 ekle",
    "Added": "Eklendi",
    "Admin": "Y\u00f6netici",
    "Admins": "Y\u00f6neticiler",
    "All": "Hepsi",
    "All Groups": "T\u00fcm Gruplar",
    "All Notifications": "T\u00fcm Bildirimler",
    "All Public Links": "T\u00fcm Genel Linkler",
    "All file types": "T\u00fcm dosya tipleri",
    "Are you sure you want to clear trash?": "\u00c7\u00f6p tenekesini bo\u015faltmak istedi\u011finize emin misiniz?",
    "Are you sure you want to delete %s ?": "%s'i silmek istedi\u011finize emin misiniz?",
    "Are you sure you want to restore this library?": "K\u00fct\u00fcphaneyi geri y\u00fcklemek istedi\u011finize emin misiniz?",
    "Audio": "Audio",
    "Avatar": "Avatar",
    "Avatar:": "Avatar:",
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Dizin %(src)s alt dizinine %(des)s kopyalanam\u0131yor.",
    "Can not move directory %(src)s to its subdirectory %(des)s": "%(src)s dizini alt dizinine %(des)s ta\u015f\u0131nam\u0131yor.",
    "Cancel": "\u0130ptal",
    "Cancel All": "Hepsini \u0130ptal Et",
    "Change": "De\u011fi\u015ftir",
    "Change Password": "\u015eifreyi De\u011fi\u015ftir",
    "Clean": "Temizle",
    "Clear": "Temizle",
    "Clear Trash": "\u00c7\u00f6p Tenekesini Bo\u015falt",
    "Clear files in trash and history\uff1a": "\u00c7\u00f6p tenekesindeki ve ge\u00e7mi\u015fteki dosyalar\u0131 sil:",
    "Close": "Kapat",
    "Close (Esc)": "Kapat (Esc)",
    "Community Edition": "Topluluk Versiyonu",
    "Confirm Password": "\u015eifreyi Onayla",
    "Copy": "Kopyala",
    "Count": "Say",
    "Created At": "Olu\u015fturuldu",
    "Created library": "Olu\u015fturulmu\u015f k\u00fct\u00fcphane",
    "Creator": "Olu\u015fturan",
    "Current Library": "Ge\u00e7erli K\u00fct\u00fcphane",
    "Current Path: ": "Ge\u00e7erli Yol:",
    "Current path: ": "Ge\u00e7erli yol:",
    "Custom file types": "\u00d6zel doya tipleri",
    "Database": "Veritaban\u0131",
    "Default": "Varsay\u0131lan",
    "Delete": "Sil",
    "Delete Account": "Hesab\u0131 Sil",
    "Delete Group": "Grubu Sil",
    "Delete Library": "K\u00fct\u00fcphaneyi Sil",
    "Delete Member": "\u00dcyeyi Sil",
    "Delete Notification": "Bildirimi Sil",
    "Delete Time": "Zaman\u0131 sil",
    "Delete User": "Kullan\u0131c\u0131y\u0131 sil",
    "Deleted": "Silindi",
    "Deleted Time": "Silinme Zaman\u0131",
    "Deleted directories": "Silinmi\u015f dizinler",
    "Deleted files": "Silinmi\u015f Dosyalar",
    "Description": "A\u00e7\u0131klama",
    "Detail": "Detay",
    "Details": "Ayr\u0131nt\u0131lar",
    "Device Name": "Cihaz Ad\u0131",
    "Devices": "Cihazlar",
    "Directory": "Dizin",
    "Document convertion failed.": "Dok\u00fcman d\u00f6n\u00fc\u015ft\u00fcrme ba\u015far\u0131s\u0131z.",
    "Documents": "D\u00f6k\u00fcmanlar",
    "Don't keep history": "Ge\u00e7mi\u015fi saklama",
    "Don't replace": "De\u011fi\u015ftirme",
    "Download": "\u0130ndir",
    "Edit": "D\u00fczenle",
    "Edit failed.": "D\u00fczenleme ba\u015far\u0131s\u0131z.",
    "Edit succeeded": "D\u00fczenleme ba\u015far\u0131l\u0131",
    "Email": "Eposta",
    "Encrypt": "\u015eifrele",
    "Error": "Hata",
    "Exit System Admin": "Sistem Y\u00f6neticisinden \u00c7\u0131k",
    "Expiration": "Zaman a\u015f\u0131m\u0131",
    "Failed": "Ba\u015far\u0131s\u0131z",
    "Failed. Please check the network.": "Ba\u015far\u0131s\u0131z oldu. L\u00fctfen a\u011f\u0131 kontrol edin.",
    "File": "Dosya",
    "File Upload": "Dosya Y\u00fckle",
    "File Uploading...": "Dosyay\u0131 Y\u00fckl\u00fcyor...",
    "File download is disabled: the share link traffic of owner is used up.": "Dosya indirme devre d\u0131\u015f\u0131 b\u0131rak\u0131ld\u0131: sahibin ba\u011flant\u0131 payla\u015f\u0131m trafi\u011fi t\u00fckendi.",
    "Files": "Dosyalar",
    "Folder": "Klas\u00f6r",
    "Folder Permission": "Klas\u00f6r izni",
    "Folders": "Klas\u00f6rler",
    "Generate": "Olu\u015ftur",
    "Group": "Grup",
    "Group Permission": "Gruop \u0130zni",
    "Groups": "Gruplar",
    "Guest": "Misafir",
    "Help": "Yard\u0131m",
    "History": "Ge\u00e7mi\u015f",
    "IP": "IP",
    "Images": "G\u00f6rseller",
    "In all libraries": "T\u00fcm k\u00fct\u00fcphanelerde",
    "Inactive": "\u0130naktif",
    "Info": "Bilgi",
    "Input file extensions here, separate with ','": "Dosya uzant\u0131lar\u0131n\u0131 buraya girin, \"\", ile ay\u0131r\u0131n",
    "Internal Server Error": "\u0130\u00e7 Sunucu Hatas\u0131",
    "Invalid destination path": "Ge\u00e7ersiz hedef yolu",
    "It is required.": "Gerekli.",
    "Keep full history": "T\u00fcm ge\u00e7mi\u015fi sakla",
    "LDAP": "LDAP",
    "LDAP(imported)": "LDAP(al\u0131nan)",
    "Language": "Dil",
    "Language Setting": "Dil Ayarlar\u0131",
    "Last Access": "Son Eri\u015fim",
    "Last Login": "En son giri\u015f",
    "Last Update": "En son G\u00fcncelleme",
    "Leave Share": "Payla\u015f\u0131mdan Ayr\u0131l",
    "Libraries": "K\u00fct\u00fcphaneler",
    "Library": "K\u00fct\u00fcphane",
    "Links": "Ba\u011flant\u0131lar",
    "Lock": "Kilitle",
    "Log out": "\u00c7\u0131k\u0131\u015f yap",
    "Logs": "Loglar",
    "Mark all read": "T\u00fcm\u00fcn\u00fc okundu olarak i\u015faretle",
    "Members": "\u00dcyeler",
    "Message": "Mesaj",
    "Message (optional):": "Mesaj (iste\u011fe ba\u011fl\u0131):",
    "Modification Details": "De\u011fi\u015ftirme Ayr\u0131nt\u0131lar\u0131",
    "Modified": "De\u011fi\u015ftirildi",
    "Modified files": "De\u011fi\u015ftirilmi\u015f dosyalar",
    "Modifier": "De\u011fi\u015ftirici",
    "Month:": "Ay:",
    "More": "Daha fazla",
    "More Operations": "Daha fazla i\u015flem",
    "Move": "Ta\u015f\u0131",
    "My Groups": "Gruplar\u0131m",
    "Name": "\u0130sim",
    "Name is required": "\u0130sim gerekli",
    "Name is required.": "\u0130sim gerekli.",
    "Name(optional)": "\u0130sim (iste\u011fe ba\u011fl\u0131)",
    "New File": "Yeni Dosya",
    "New Folder": "Yeni Klas\u00f6r",
    "New Group": "Yeni Grup",
    "New Library": "Yeni K\u00fct\u00fcphane",
    "New Password": "Yeni \u015eifre",
    "New Password Again": "Yeni \u015e\u0130fre Tekrar",
    "New directories": "Yeni dizinler",
    "New files": "Yeni Dosyalar",
    "New password is too short": "Yeni \u015fifre \u00e7ok k\u0131sa",
    "New passwords don't match": "Yeni \u015fifreler e\u015fle\u015fmiyor",
    "Next": "Sonraki",
    "Next (Right arrow key)": "Sonraki (Sa\u011f ok tu\u015fu)",
    "No result": "Sonu\u00e7 yok",
    "None": "Yok                                     ",
    "Notification Detail": "Bildirim Detay\u0131",
    "Notifications": "Bildirimler",
    "Number of groups": "Grup say\u0131s\u0131",
    "Old Password": "Eski \u015eifre",
    "Only keep a period of history:": "Sadece bu d\u00f6nemdeki ge\u00e7mi\u015fi sakla:",
    "Open in New Tab": "Yeni bir Sekmede A\u00e7",
    "Open via Client": "Client \u00fczerinden a\u00e7",
    "Operation": "\u0130\u015flem",
    "Operation succeeded.": "\u0130\u015flem ba\u015far\u0131l\u0131.",
    "Operations": "\u0130\u015flemler",
    "Organization": "Organizasyon",
    "Organizations": "Organizasyonlar",
    "Other Libraries": "Di\u011fer K\u00fct\u00fcphaneler",
    "Owner": "Sahip",
    "Owner can use admin panel in an organization, must be a new account.": "Bir organizasyonda y\u00f6netici panelini sahip kullanabilir ve bu yeni bir hesap olmal\u0131d\u0131r.",
    "Password": "\u015eifre",
    "Password again": "\u015eifre tekrar",
    "Password is too short": "\u015eifre \u00e7ok k\u0131sa",
    "Password:": "\u015eifre:",
    "Passwords don't match": "\u015eifreler e\u015fle\u015fmiyor.",
    "Permission": "\u0130zin",
    "Permission denied": "\u0130zin reddedildi",
    "Permission:": "\u0130zin:",
    "Platform": "Platform",
    "Please check the network.": "L\u00fctfen a\u011f\u0131 kontrol edin.",
    "Please enter days": "L\u00fctfen g\u00fcnleri girin",
    "Please enter password": "L\u00fctfen \u015fifre giriniz",
    "Please enter the new password again": "L\u00fctfen yeni \u015fifreyi tekrar giriniz",
    "Please enter the old password": "L\u00fctfen eski \u015fifreyi giriniz",
    "Please enter the password again": "L\u00fctfen \u015fifreyi tekrar giriniz.",
    "Please input at least an email.": "L\u00fctfen en az bir eposta giri\u015fi yap\u0131n",
    "Previous": "\u00d6nceki",
    "Previous (Left arrow key)": "\u00d6nceki (Sol ok tu\u015fu)",
    "Professional Edition": "Profesyonel Versiyon",
    "Profile": "Profil",
    "Profile Setting": "Profil Ayarlar\u0131",
    "Read-Only": "Salt okunur",
    "Read-Write": "Okuma-Yazma",
    "Really want to delete your account?": "Hesab\u0131n\u0131z\u0131 silmeyi ger\u00e7ekten istiyor musunuz?",
    "Remove": "Kald\u0131r",
    "Rename": "Yeniden Adland\u0131r",
    "Rename File": "Dosyay\u0131 yeniden adland\u0131r",
    "Renamed or Moved files": "Yeniden Adland\u0131r\u0131lm\u0131\u015f ya da Ta\u015f\u0131nm\u0131\u015f Dosyalar",
    "Replace": "De\u011fi\u015ftir",
    "Replacing it will overwrite its content.": "De\u011fi\u015ftirirseniz, i\u00e7eri dosyan\u0131n \u00fczerine yazacak.",
    "Reset Password": "\u015eifre S\u0131f\u0131rla",
    "ResetPwd": "\u015eifreyi S\u0131f\u0131rla",
    "Restore": "Eski durumuna getir",
    "Restore Library": "K\u00fct\u00fcphaneyi Geri Y\u00fckle",
    "Result": "Sonu\u00e7",
    "Revoke Admin": "Y\u00f6neticiyi \u0130ptal et",
    "Role": "Rol",
    "Saving...": "Kaydediliyor...",
    "Seafile": "Seafile",
    "Search Files": "Dosya Ara",
    "Search files in this library": "Dosyalar\u0131 bu k\u00fct\u00fcphanede ara",
    "See All Notifications": "T\u00fcm Bildirimleri G\u00f6r",
    "Select libraries to share": "Payla\u015fmak i\u00e7in k\u00fct\u00fcphane se\u00e7in",
    "Send": "G\u00f6nder",
    "Send to:": "\u015euna g\u00f6nder:",
    "Sending...": "G\u00f6nderiyor...",
    "Server Version: ": "Sunucu Versiyonu:",
    "Set Admin": "Y\u00f6netici Olu\u015ftur",
    "Set Quota": "Kota Olu\u015ftur",
    "Set to current": "\u015eimdikine ayarla",
    "Settings": "Ayarlar",
    "Share": "Payla\u015f",
    "Share Admin": "Payla\u015fma Y\u00f6neticisi",
    "Share From": "Buradan Payla\u015f",
    "Share To": "\u015eununla payla\u015f",
    "Share existing libraries": "Mevcut k\u00fct\u00fcphaneleri payla\u015f",
    "Share to group": "Grupla Payla\u015f",
    "Share to user": "Kullan\u0131c\u0131 ile Payla\u015f",
    "Shared By": "Payla\u015fan",
    "Shared Links": "Payla\u015f\u0131lan ba\u011flant\u0131lar",
    "Shared by: ": "Payla\u015fan:",
    "Size": "Boyut",
    "Space Used": "Kullan\u0131lm\u0131\u015f Alan",
    "Status": "Durum",
    "Submit": "G\u00f6nder",
    "Success": "Ba\u015far\u0131l\u0131",
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla kopyaland\u0131.",
    "Successfully copied %(name)s and 1 other item.": "%(name)s ve 1 di\u011fer \u00f6\u011fe ba\u015far\u0131yla kopyaland\u0131.",
    "Successfully copied %(name)s.": "%(name)s ba\u015far\u0131yla kopyaland\u0131.",
    "Successfully deleted %s": "%s silindi",
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla ta\u015f\u0131nd\u0131.",
    "Successfully moved %(name)s and 1 other item.": "%(name)s ve 1 di\u011fer \u00f6\u011fe ba\u015far\u0131yla ta\u015f\u0131nd\u0131.",
    "Successfully moved %(name)s.": "%(name)s ba\u015far\u0131yla ta\u015f\u0131nd\u0131.",
    "Successfully reset password to %(passwd)s for user %(user)s.": "Kullan\u0131c\u0131 %(user)s i\u00e7in \u015fifre %(passwd)s'e s\u0131f\u0131rland\u0131.",
    "Successfully revoke the admin permission of %s": "%s i\u00e7in y\u00f6netici izni iptal edildi.",
    "Successfully sent to {placeholder}": "{placeholder}'a g\u00f6nderildi",
    "Successfully set %s as admin.": "%s y\u00f6netici olarak olu\u015fturuldu.",
    "System": "Sistem",
    "System Admin": "Sistem Y\u00f6neticisi",
    "System Info": "Sistem Bilgisi",
    "Text files": "Metin dosyalar\u0131",
    "The password will be kept in the server for only 1 hour.": "\u015eifre sadece 1 saat sunucuda tutulacakt\u0131r.",
    "This library is password protected": "Bu k\u00fct\u00fcphane \u015fifre korumal\u0131.",
    "This operation will not be reverted. Please think twice!": "Bu i\u015flem geri al\u0131namaz. L\u00fctfen iki kez d\u00fc\u015f\u00fcn\u00fcn\u00fcn!",
    "Time": "Zaman",
    "Tip: 0 means default limit": "T\u00fcyo: 0 varsay\u0131lan limit anlam\u0131na gelir.",
    "Traffic": "Trafik",
    "Transfer": "Transfer",
    "Transfer Library": "K\u00fct\u00fcphaneyi transfer et",
    "Trash": "\u00c7\u00f6p Kutusu",
    "Type": "Tip",
    "Unknown": "Bilinmeyen",
    "Unlink": "Ba\u011flant\u0131y\u0131 kald\u0131r",
    "Unlock": "Kilidi A\u00e7",
    "Unshare": "Payla\u015fma",
    "Unshare Library": "K\u00fct\u00fcphane payla\u015f\u0131m\u0131n\u0131 kald\u0131r",
    "Unstar": "Y\u0131ld\u0131z\u0131 kald\u0131r",
    "Update": "G\u00fcncelle",
    "Upgrade to Pro Edition": "Pro Versiyona Y\u00fckseltin",
    "Upload": "Y\u00fckle",
    "Upload Files": "Dosyalar\u0131 y\u00fckle",
    "Upload Folder": "Klas\u00f6r y\u00fckle",
    "Upload Link": "Ba\u011flant\u0131y\u0131 Y\u00fckle",
    "Upload Links": "Ba\u011flant\u0131lar\u0131 Y\u00fckle",
    "Upload file": "Dosya y\u00fckle",
    "Used:": "Kullan\u0131ld\u0131:",
    "User": "Kullan\u0131c\u0131",
    "User Permission": "Kullan\u0131c\u0131 \u0130zni",
    "Users": "Kullan\u0131c\u0131lar",
    "Video": "Video",
    "View": "G\u00f6r\u00fcnt\u00fcle",
    "View Snapshot": "Snapshot G\u00f6ster",
    "Visits": "Ziyaretler",
    "Wrong password": "Hatal\u0131 \u015fifre",
    "You can also add a user as a guest, who will not be allowed to create libraries and groups.": "Bir kullan\u0131c\u0131y\u0131 misafir olarak da ekleyebilirsiniz. Misafir kullan\u0131c\u0131n\u0131n k\u00fct\u00fcphane ve grup olu\u015fturma izni yoktur.",
    "ZIP": "ZIP",
    "all": "hepsi",
    "all members": "t\u00fcm \u00fcyeler",
    "days": "g\u00fcn",
    "file": "dosya",
    "icon": "simge",
    "locked": "kilitli",
    "name": "isim",
    "starred": "y\u0131ld\u0131zl\u0131",
    "to": "Kime",
    "unstarred": "Y\u0131ld\u0131z\u0131 kald\u0131r\u0131lm\u0131\u015f",
    "you can also press \u2190 ": "\u015euna da basabilirsiniz \u2190"
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


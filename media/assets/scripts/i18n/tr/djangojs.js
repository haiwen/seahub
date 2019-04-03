

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
    "A file with the same name already exists in this folder.": "Bu klas\u00f6rde ayn\u0131 isimde bir dosya zaten var.", 
    "About Us": "Hakk\u0131m\u0131zda", 
    "Active": "Aktif", 
    "Activities": "Etkinlikler", 
    "Add Admins": "Y\u00f6netici Ekle", 
    "Add Library": "K\u00fct\u00fcphane ekle", 
    "Add admin": "Y\u00f6netici ekle", 
    "Add auto expiration": "Otomatik sona erme ekle", 
    "Add password protection": "\u015eifre koruma ekle", 
    "Add user": "Kullan\u0131c\u0131 ekle", 
    "Admin": "Y\u00f6netici", 
    "All": "Hepsi", 
    "All Groups": "T\u00fcm Gruplar", 
    "All Public Links": "T\u00fcm Genel Linkler", 
    "Are you sure you want to clear trash?": "\u00c7\u00f6p tenekesini bo\u015faltmak istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete %s ?": "%s'i silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete %s completely?": "%s'i tamamen silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete all %s's libraries?": "%s'e ait t\u00fcm k\u00fct\u00fcphaneleri silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to delete these selected items?": "Se\u00e7ili \u00f6\u011feleri silmek istedi\u011finize emin misiniz?", 
    "Are you sure you want to quit this group?": "Gruptan \u00e7\u0131kmak istedi\u011finize emin misiniz?", 
    "Are you sure you want to restore %s?": "%s'i yeniden y\u00fcklemek istedi\u011finize emin misiniz?", 
    "Are you sure you want to unshare %s ?": "%s payla\u015f\u0131m\u0131n\u0131 kald\u0131rmak istedi\u011finize emin misiniz?", 
    "Avatar": "Avatar", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Dizin %(src)s alt dizinine %(des)s kopyalanam\u0131yor.", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "%(src)s dizini alt dizinine %(des)s ta\u015f\u0131nam\u0131yor.", 
    "Cancel": "\u0130ptal", 
    "Cancel All": "Hepsini \u0130ptal Et", 
    "Canceled.": "\u0130ptal edildi.", 
    "Change Password": "\u015eifreyi De\u011fi\u015ftir", 
    "Clear Trash": "\u00c7\u00f6p Tenekesini Bo\u015falt", 
    "Close": "Kapat", 
    "Close (Esc)": "Kapat (Esc)", 
    "Confirm Password": "\u015eifreyi Onayla", 
    "Copy": "Kopyala", 
    "Copying %(name)s": "%(name)s kopyalan\u0131yor.", 
    "Copying file %(index)s of %(total)s": "%(total)s i\u00e7inden %(index)s dosyas\u0131 kopyalan\u0131yor", 
    "Count": "Say", 
    "Create At / Last Login": "Olu\u015ftur / Son Giri\u015f", 
    "Created At": "Olu\u015fturuldu", 
    "Created library": "Olu\u015fturulmu\u015f k\u00fct\u00fcphane", 
    "Creator": "Olu\u015fturan", 
    "Current Library": "Ge\u00e7erli K\u00fct\u00fcphane", 
    "Delete": "Sil", 
    "Delete Group": "Grubu Sil", 
    "Delete Items": "\u00d6\u011feleri sil", 
    "Delete Library": "K\u00fct\u00fcphaneyi Sil", 
    "Delete Library By Owner": "Sahibine g\u00f6re k\u00fct\u00fcphane sil", 
    "Delete Member": "\u00dcyeyi Sil", 
    "Delete User": "Kullan\u0131c\u0131y\u0131 sil", 
    "Deleted Time": "Silinme Zaman\u0131", 
    "Deleted directories": "Silinmi\u015f dizinler", 
    "Deleted files": "Silinmi\u015f Dosyalar", 
    "Details": "Ayr\u0131nt\u0131lar", 
    "Device Name": "Cihaz Ad\u0131", 
    "Devices": "Cihazlar", 
    "Dismiss": "Sonland\u0131r", 
    "Dismiss Group": "Grubu Sonland\u0131r", 
    "Document convertion failed.": "Dok\u00fcman d\u00f6n\u00fc\u015ft\u00fcrme ba\u015far\u0131s\u0131z.", 
    "Don't keep history": "Ge\u00e7mi\u015fi saklama", 
    "Don't replace": "De\u011fi\u015ftirme", 
    "Download": "\u0130ndir", 
    "Edit": "D\u00fczenle", 
    "Edit Page": "Sayfay\u0131 D\u00fczenle", 
    "Edit failed.": "D\u00fczenleme ba\u015far\u0131s\u0131z.", 
    "Email": "Eposta", 
    "Empty file upload result": "Bo\u015f dosya y\u00fckleme sonucu", 
    "Encrypt": "\u015eifrele", 
    "Error": "Hata", 
    "Expiration": "Zaman a\u015f\u0131m\u0131", 
    "Failed to send to {placeholder}": "{placeholder}'a g\u00f6nderilemedi", 
    "Failed.": "Ba\u015far\u0131s\u0131z.", 
    "Failed. Please check the network.": "Ba\u015far\u0131s\u0131z oldu. L\u00fctfen a\u011f\u0131 kontrol edin.", 
    "File": "Dosya", 
    "File Name": "Dosya \u0130smi", 
    "File Upload": "Dosya Y\u00fckle", 
    "File Upload canceled": "Dosya Y\u00fckleme iptal edildi", 
    "File Upload complete": "Dosya Y\u00fckleme tamamland\u0131", 
    "File Upload failed": "Dosya Y\u00fckleme Ba\u015far\u0131s\u0131z", 
    "File Uploading...": "Dosyay\u0131 Y\u00fckl\u00fcyor...", 
    "File download is disabled: the share link traffic of owner is used up.": "Dosya indirme devre d\u0131\u015f\u0131 b\u0131rak\u0131ld\u0131: sahibin ba\u011flant\u0131 payla\u015f\u0131m trafi\u011fi t\u00fckendi.", 
    "File is locked": "Dosya kilitli", 
    "File is too big": "Dosya \u00e7ok b\u00fcy\u00fck", 
    "File is too small": "Dosya \u00e7ok k\u00fc\u00e7\u00fck", 
    "Files": "Dosyalar", 
    "Filetype not allowed": "Dosya tipine izin verilmiyor.", 
    "Folder": "Klas\u00f6r", 
    "Folder Permission": "Klas\u00f6r izni", 
    "Folders": "Klas\u00f6rler", 
    "Generate": "Olu\u015ftur", 
    "Group": "Grup", 
    "Groups": "Gruplar", 
    "Help": "Yard\u0131m", 
    "History": "Ge\u00e7mi\u015f", 
    "IP": "IP", 
    "Inactive": "\u0130naktif", 
    "Info": "Bilgi", 
    "Internal error. Failed to copy %(name)s.": "\u0130\u00e7 hata. %(name)s kopyalama ba\u015far\u0131s\u0131z.", 
    "Internal error. Failed to move %(name)s.": "\u0130\u00e7 hata. %(name)s ta\u015f\u0131ma ba\u015far\u0131s\u0131z.", 
    "Invalid destination path": "Ge\u00e7ersiz hedef yolu", 
    "It is required.": "Gerekli.", 
    "Just now": "\u015eu anda", 
    "Keep full history": "T\u00fcm ge\u00e7mi\u015fi sakla", 
    "Last Access": "Son Eri\u015fim", 
    "Last Update": "En son G\u00fcncelleme", 
    "Leave Share": "Payla\u015f\u0131mdan Ayr\u0131l", 
    "Libraries": "K\u00fct\u00fcphaneler", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Yaz\u0131labilir k\u00fct\u00fcphane olarak payla\u015f\u0131lan k\u00fct\u00fcphaneler di\u011fer grup \u00fcyeleri taraf\u0131ndan indirilebilir ve senkronize edilebilir. Salt okunur k\u00fct\u00fcphaneler sadece indirilebilir, ba\u015fkalar\u0131n\u0131n yapt\u0131\u011f\u0131 g\u00fcncellemeler y\u00fcklenmeyecektir.", 
    "Library": "K\u00fct\u00fcphane", 
    "Links": "Ba\u011flant\u0131lar", 
    "Loading...": "Y\u00fckleniyor...", 
    "Lock": "Kilitle", 
    "Log out": "\u00c7\u0131k\u0131\u015f yap", 
    "Logs": "Loglar", 
    "Members": "\u00dcyeler", 
    "Modification Details": "De\u011fi\u015ftirme Ayr\u0131nt\u0131lar\u0131", 
    "Modified files": "De\u011fi\u015ftirilmi\u015f dosyalar", 
    "More": "Daha fazla", 
    "More Operations": "Daha fazla i\u015flem", 
    "Move": "Ta\u015f\u0131", 
    "Moving %(name)s": "%(name)s ta\u015f\u0131n\u0131yor.", 
    "Moving file %(index)s of %(total)s": "%(total)s i\u00e7inden %(index)s dosyas\u0131 ta\u015f\u0131n\u0131yor.", 
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
    "No library is shared to this group": "Bu grupla payla\u015f\u0131lan bir k\u00fct\u00fcphane yok", 
    "Notifications": "Bildirimler", 
    "Old Password": "Eski \u015eifre", 
    "Only an extension there, please input a name.": "Sadece uzant\u0131 var, l\u00fctfen bir isim giriniz.", 
    "Only keep a period of history:": "Sadece bu d\u00f6nemdeki ge\u00e7mi\u015fi sakla:", 
    "Open in New Tab": "Yeni bir Sekmede A\u00e7", 
    "Open via Client": "Client \u00fczerinden a\u00e7", 
    "Operations": "\u0130\u015flemler", 
    "Organization": "Organizasyon", 
    "Organizations": "Organizasyonlar", 
    "Other Libraries": "Di\u011fer K\u00fct\u00fcphaneler", 
    "Owner": "Sahip", 
    "Pages": "Sayfalar", 
    "Password": "\u015eifre", 
    "Password again": "\u015eifre tekrar", 
    "Password is required.": "\u015eifre gerekli.", 
    "Password is too short": "\u015eifre \u00e7ok k\u0131sa", 
    "Passwords don't match": "\u015eifreler e\u015fle\u015fmiyor.", 
    "Permission": "\u0130zin", 
    "Permission denied": "\u0130zin reddedildi", 
    "Platform": "Platform", 
    "Please check the network.": "L\u00fctfen a\u011f\u0131 kontrol edin.", 
    "Please choose a CSV file": "L\u00fctfen bir CVS dosyas\u0131 se\u00e7iniz", 
    "Please click and choose a directory.": "L\u00fctfen t\u0131klay\u0131n ve bir dizin se\u00e7in.", 
    "Please enter password": "L\u00fctfen \u015fifre giriniz", 
    "Please enter the new password again": "L\u00fctfen yeni \u015fifreyi tekrar giriniz", 
    "Please enter the old password": "L\u00fctfen eski \u015fifreyi giriniz", 
    "Please enter the password again": "L\u00fctfen \u015fifreyi tekrar giriniz.", 
    "Please enter valid days": "L\u00fctfen ge\u00e7erli g\u00fcnler girin", 
    "Please input at least an email.": "L\u00fctfen en az bir eposta giri\u015fi yap\u0131n", 
    "Previous": "\u00d6nceki", 
    "Previous (Left arrow key)": "\u00d6nceki (Sol ok tu\u015fu)", 
    "Processing...": "\u0130\u015fleniyor...", 
    "Quit Group": "Gruptan \u00c7\u0131k", 
    "Read-Only": "Salt okunur", 
    "Read-Write": "Okuma-Yazma", 
    "Really want to dismiss this group?": "Bu grubu sonland\u0131rmay\u0131 ger\u00e7ekten istiyor musunuz?", 
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
    "Revoke Admin": "Y\u00f6neticiyi \u0130ptal et", 
    "Role": "Rol", 
    "Saving...": "Kaydediliyor...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Seafile Wiki ile bilginizi basit bir bi\u00e7imde organize edbilirsiniz. Wiki i\u00e7eri\u011fi normal bir k\u00fct\u00fcphanede \u00f6nceden tan\u0131mlanm\u0131\u015f dosya/klas\u00f6r yap\u0131s\u0131nda depolan\u0131r. B\u00f6ylelikle wikinizi masa\u00fcst\u00fcnde d\u00fczenleyebilir ve sonra sunucuya senkronize edebilirsiniz.", 
    "Search Files": "Dosya Ara", 
    "Search files in this library": "Dosyalar\u0131 bu k\u00fct\u00fcphanede ara", 
    "See All Notifications": "T\u00fcm Bildirimleri G\u00f6r", 
    "Select groups": "Grup se\u00e7in", 
    "Select libraries to share": "Payla\u015fmak i\u00e7in k\u00fct\u00fcphane se\u00e7in", 
    "Server Version: ": "Sunucu Versiyonu:", 
    "Set Quota": "Kota Olu\u015ftur", 
    "Settings": "Ayarlar", 
    "Share": "Payla\u015f", 
    "Share Admin": "Payla\u015fma Y\u00f6neticisi", 
    "Share From": "Buradan Payla\u015f", 
    "Share To": "\u015eununla payla\u015f", 
    "Share existing libraries": "Mevcut k\u00fct\u00fcphaneleri payla\u015f", 
    "Share to group": "Grupla Payla\u015f", 
    "Share to user": "Kullan\u0131c\u0131 ile Payla\u015f", 
    "Show": "G\u00f6ster", 
    "Size": "Boyut", 
    "Space Used": "Kullan\u0131lm\u0131\u015f Alan", 
    "Start": "Ba\u015fla", 
    "Status": "Durum", 
    "Submit": "G\u00f6nder", 
    "Success": "Ba\u015far\u0131l\u0131", 
    "Successfully copied %(name)s": "%(name)s ba\u015far\u0131yla kopyaland\u0131", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla kopyaland\u0131.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s ve 1 di\u011fer \u00f6\u011fe ba\u015far\u0131yla kopyaland\u0131.", 
    "Successfully copied %(name)s.": "%(name)s ba\u015far\u0131yla kopyaland\u0131.", 
    "Successfully deleted %(name)s": "%(name)s ba\u015far\u0131yla tamamland\u0131.", 
    "Successfully deleted %(name)s and %(amount)s other items.": " %(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla silindi.", 
    "Successfully deleted %(name)s.": "%(name)s ba\u015far\u0131yla silindi.", 
    "Successfully deleted %s": "%s silindi", 
    "Successfully moved %(name)s": "%(name)s ba\u015far\u0131yla ta\u015f\u0131nd\u0131", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s ve %(amount)s ba\u015fka \u00f6\u011fe ba\u015far\u0131yla ta\u015f\u0131nd\u0131.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s ve 1 di\u011fer \u00f6\u011fe ba\u015far\u0131yla ta\u015f\u0131nd\u0131.", 
    "Successfully moved %(name)s.": "%(name)s ba\u015far\u0131yla ta\u015f\u0131nd\u0131.", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "Kullan\u0131c\u0131 %(user)s i\u00e7in \u015fifre %(passwd)s'e s\u0131f\u0131rland\u0131.", 
    "Successfully revoke the admin permission of %s": "%s i\u00e7in y\u00f6netici izni iptal edildi.", 
    "Successfully sent to {placeholder}": "{placeholder}'a g\u00f6nderildi", 
    "Successfully set %s as admin.": "%s y\u00f6netici olarak olu\u015fturuldu.", 
    "System Admin": "Sistem Y\u00f6neticisi", 
    "The password will be kept in the server for only 1 hour.": "\u015eifre sadece 1 saat sunucuda tutulacakt\u0131r.", 
    "This library is password protected": "Bu k\u00fct\u00fcphane \u015fifre korumal\u0131.", 
    "Time": "Zaman", 
    "Transfer": "Transfer", 
    "Transfer Library": "K\u00fct\u00fcphaneyi transfer et", 
    "Trash": "\u00c7\u00f6p Kutusu", 
    "Type": "Tip", 
    "Unlink": "Ba\u011flant\u0131y\u0131 kald\u0131r", 
    "Unlock": "Kilidi A\u00e7", 
    "Unshare": "Payla\u015fma", 
    "Unshare Library": "K\u00fct\u00fcphane payla\u015f\u0131m\u0131n\u0131 kald\u0131r", 
    "Unstar": "Y\u0131ld\u0131z\u0131 kald\u0131r", 
    "Update": "G\u00fcncelle", 
    "Upload": "Y\u00fckle", 
    "Upload Files": "Dosyalar\u0131 y\u00fckle", 
    "Upload Folder": "Klas\u00f6r y\u00fckle", 
    "Upload Link": "Ba\u011flant\u0131y\u0131 Y\u00fckle", 
    "Upload Links": "Ba\u011flant\u0131lar\u0131 Y\u00fckle", 
    "Uploaded bytes exceed file size": "Y\u00fcklenen baytlar dosya boyutunu a\u015f\u0131yor.", 
    "Used:": "Kullan\u0131ld\u0131:", 
    "User": "Kullan\u0131c\u0131", 
    "Users": "Kullan\u0131c\u0131lar", 
    "View": "G\u00f6r\u00fcnt\u00fcle", 
    "Visits": "Ziyaretler", 
    "Wrong password": "Hatal\u0131 \u015fifre", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "Dosyalar\u0131n\u0131z\u0131 d\u00fczenlemek i\u00e7in k\u00fct\u00fcphane olu\u015fturabilirsiniz. \u00d6rne\u011fin, her proje i\u00e7in bir k\u00fct\u00fcphane olu\u015fturabilirsiniz. Her k\u00fct\u00fcphane senkronize ediliebilir ve ayr\u0131 olarak payla\u015f\u0131labilir.", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "Kay\u0131tl\u0131 bir kullan\u0131c\u0131 ile t\u00fcm k\u00fct\u00fcphaneyi payla\u015fmak istemiyorsan\u0131z, tek bir klas\u00f6r payla\u015fabilirsiniz.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "K\u00fct\u00fcphane payla\u015fmak i\u00e7in \u00fcstteki \"Yeni K\u00fct\u00fcphane\" d\u00fc\u011fmesini ya da k\u00fct\u00fcphaneler listenizdeki \"Payla\u015f\" simgesini t\u0131klayabilirsiniz.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "Olu\u015fturdu\u011funuz ba\u011flant\u0131y\u0131 di\u011ferleriyle payla\u015fabilirsiniz. Payla\u015ft\u0131\u011f\u0131n\u0131z ki\u015filer ba\u011flant\u0131 \u00fczerinden bu dizine dosya y\u00fckleyebilirler. ", 
    "You have not created any libraries": "Hen\u00fcz hi\u00e7 k\u00fct\u00fcphane olu\u015fturmad\u0131n\u0131z", 
    "all members": "t\u00fcm \u00fcyeler", 
    "canceled": "iptal edildi", 
    "days": "g\u00fcn", 
    "icon": "simge", 
    "locked": "kilitli", 
    "name": "isim", 
    "starred": "y\u0131ld\u0131zl\u0131", 
    "unstarred": "Y\u0131ld\u0131z\u0131 kald\u0131r\u0131lm\u0131\u015f", 
    "uploaded": "y\u00fcklendi", 
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


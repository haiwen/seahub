

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n != 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "About": "Sobre", 
    "About Us": "Sobre mi:", 
    "Active": "Actiu", 
    "Activities": "Activitat", 
    "Add Admins": "Afegeix administradors", 
    "Admin": "Administra", 
    "All": "Tots", 
    "All Groups": "Tots els grups", 
    "All Public Links": "Tot els enlla\u00e7os p\u00fablics", 
    "Are you sure you want to delete %s ?": "Esteu segur que voleu eliminar %s ?", 
    "Are you sure you want to delete these selected items?": "Esteu segur que voleu eliminar els elements seleccionats?", 
    "Are you sure you want to quit this group?": "Esteu segur que voleu abandonar aquest grup?", 
    "Are you sure you want to unshare %s ?": "Esteu segur que voleu deixar de compartir %s ?", 
    "Avatar": "Avatar", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "No es pot copiar el directori %(src)s al seu subdirectori %(des)s", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "No \u00e9s possible moure el directori %(src)s al subdirectori %(des)s", 
    "Cancel": "Cancela", 
    "Cancel All": "Cancel\u00b7la-ho tot", 
    "Clients": "Terminals", 
    "Close": "Tanca", 
    "Confirm Password": "Confirmeu la contrasenya", 
    "Copy": "C\u00f2pia", 
    "Count": "Compte", 
    "Create At / Last Login": "Alta / \u00daltima sessi\u00f3", 
    "Created library": "S'ha creat la llibreria ", 
    "Creator": "Autor", 
    "Current Library": "Llibreria actual", 
    "Delete": "Elimina", 
    "Delete Group": "Elimina el grup", 
    "Delete Items": "Elimina els elements", 
    "Delete Member": "Elimina membre", 
    "Delete User": "Elimina l'usuari", 
    "Deleted directories": "Directoris eliminats", 
    "Deleted files": "Fitxers eliminats", 
    "Details": "Detalls", 
    "Dismiss": "Ignora", 
    "Dismiss Group": "Abandona el grup", 
    "Document convertion failed.": "S'ha produ\u00eft un error al convertir el document.", 
    "Don't keep history": "No conservis l'historial", 
    "Download": "Descarrega", 
    "Edit": "Edita", 
    "Edit Page": "Edita la p\u00e0gina", 
    "Edit failed.": "No s'ha pogut actualitzar.", 
    "Email": "Correu electr\u00f2nic", 
    "Empty file upload result": "S'ha pujat un fitxer buit", 
    "Encrypt": "Encripta", 
    "Error": "Error", 
    "Failed.": "Error.", 
    "Failed. Please check the network.": "Error. Verifiqueu la connexi\u00f3 a la xarxa", 
    "File": "Fitxer", 
    "File Name": "Nom de fitxer", 
    "File is too big": "El fitxer \u00e9s massa gran", 
    "File is too small": "El fitxer \u00e9s massa petit", 
    "Files": "Fitxers", 
    "Filetype not allowed": "Aquest tipus de fitxer no est\u00e0 perm\u00e8s", 
    "Folders": "Directoris", 
    "Generate": "Genera", 
    "Group": "Grup", 
    "Groups": "Grups", 
    "Help": "Ajuda", 
    "History": "Historial", 
    "IP": "IP", 
    "Inactive": "Inactiu", 
    "Info": "Informaci\u00f3", 
    "Internal error. Failed to copy %(name)s.": "Error intern. No s'ha copiat %(name)s.", 
    "Internal error. Failed to move %(name)s.": "Error intern. No s'ha mogut %(name)s.", 
    "Invalid destination path": "La ruta de dest\u00ed no \u00e9s v\u00e0lida", 
    "It is required.": "\u00c9s obligatori.", 
    "Just now": "Ara mateix", 
    "Keep full history": "Conserva tot l'historial", 
    "Last Update": "\u00daltima actualitzaci\u00f3", 
    "Leave Share": "Deixa de compartir", 
    "Libraries": "Llibreries", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Les llibreries compartides amb perm\u00eds d'escriptura poden ser descarregades i sincronitzades pels altres membres del grup. Les de nom\u00e9s lectura poden ser descarregades per\u00f2 no actualitzades pels altres membres.", 
    "Library": "Llibreria", 
    "Links": "Enlla\u00e7os", 
    "Loading...": "S'est\u00e0 carregant...", 
    "Log out": "Tanca la sessi\u00f3", 
    "Members": "Membres", 
    "Modification Details": "Detall de la modificaci\u00f3", 
    "Modified files": "Fitxers modificats", 
    "More": "M\u00e9s", 
    "More Operations": "M\u00e9s operacions", 
    "Move": "Mou", 
    "My Groups": "Els meus grups", 
    "Name": "Nom", 
    "Name is required": "El nom \u00e9s obligatori", 
    "Name is required.": "El nom \u00e9s obligatori.", 
    "Name(optional)": "Nom (opcional)", 
    "New File": "Crea un fitxer", 
    "New Group": "Crea un grup", 
    "New Library": "Crea una llibreria", 
    "New directories": "Directoris nous", 
    "New files": "Fitxers nous", 
    "Next": "Seg\u00fcent", 
    "Notifications": "Notificacions", 
    "Only an extension there, please input a name.": "Cal el nom complet, no nom\u00e9s l'extensi\u00f3.", 
    "Only keep a period of history:": "Nom\u00e9s conserva l'historial dels darrers:", 
    "Operations": "Operacions", 
    "Organization": "Organitzaci\u00f3", 
    "Other Libraries": "Altres llibreries", 
    "Owner": "Propietari", 
    "Pages": "P\u00e0gines", 
    "Password": "Contrasenya", 
    "Password again": "Repeteix la contrasenya", 
    "Password is required.": "Es requereix contrasenya.", 
    "Password is too short": "La contrasenya \u00e9s massa curta", 
    "Passwords don't match": "Les contrasenyes no coincideixen", 
    "Permission": "Perm\u00eds", 
    "Permission denied": "S'ha denegat l'acc\u00e9s ", 
    "Please check the network.": "Verifiqueu la connexi\u00f3 a la xarxa", 
    "Please click and choose a directory.": "Seleccioneu un directori", 
    "Please enter password": "Introdu\u00efu la contrasenya", 
    "Please enter the password again": "Torneu a introduir la contrasenya", 
    "Please input at least an email.": "Introdu\u00efu un correu electr\u00f2nic com a m\u00ednim.", 
    "Previous": "Anterior", 
    "Processing...": "Processant...", 
    "Quit Group": "Surt del grup", 
    "Read-Only": "Nom\u00e9s lectura", 
    "Read-Write": "Lectura-Escriptura", 
    "Really want to dismiss this group?": "Esteu segur que voleu abandonar el grup?", 
    "Remove": "Elimina", 
    "Rename": "Reanomena", 
    "Rename File": "Reanomena el fitxer", 
    "Renamed or Moved files": "Fitxers moguts o reanomenats", 
    "ResetPwd": "ReiniContra", 
    "Restore": "Restaura", 
    "Restore Library": "Restaura la llibreria", 
    "Revoke Admin": "Revoca el perm\u00eds d'administrador", 
    "Saving...": "Guardant...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "La Wiki del Seafile permet organitzar el coneixement d'una forma senzilla. Les p\u00e0gines de la wiki es guarden en una llibreria normal en forma de fitxers i directoris. Aix\u00f2 permet editar-la des del seu ordinador i sincronitzar-la amb el servidor com qualsevol altre fitxer.", 
    "Search Files": "Cerca fitxers", 
    "Search files in this library": "Cerca fitxers a la llibreria", 
    "Server Version: ": "Versi\u00f3 del servidor:", 
    "Set Quota": "Estableix quota", 
    "Settings": "Configuraci\u00f3", 
    "Share": "Comparteix", 
    "Share Admin": "Comparteix l'administraci\u00f3", 
    "Share From": "Compartit desde", 
    "Share To": "Comparteix amb", 
    "Size": "Mida", 
    "Space Used": "Espai ocupat", 
    "Start": "Inicia", 
    "Status": "Estat", 
    "Submit": "Envia", 
    "Successfully copied %(name)s and %(amount)s other items.": "S'ha copiat %(name)s i %(amount)s m\u00e9s.", 
    "Successfully copied %(name)s.": "S'ha copiat %(name)s.", 
    "Successfully deleted %(name)s": "S'ha eliminat %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "S'ha eliminat %(name)s i %(amount)s elements m\u00e9s.", 
    "Successfully deleted %(name)s.": "S'ha eliminat %(name)s.", 
    "Successfully deleted %s": "S'ha eliminat %s", 
    "Successfully moved %(name)s and %(amount)s other items.": "S'ha mogut %(name)s i %(amount)s m\u00e9s.", 
    "Successfully moved %(name)s.": "S'ha mogut %(name)s.", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "S'ha reinicialitzat la contrasenya a %(passwd)s per l'usuari %(user)s.", 
    "Successfully revoke the admin permission of %s": "S'ha revocat el perm\u00eds d'administrador a %s", 
    "System Admin": "Administrador de sistema", 
    "The password will be kept in the server for only 1 hour.": "El servidor guardar\u00e0 la contrasenya nom\u00e9s 1 hora.", 
    "Time": "Data", 
    "Transfer": "Transfereix", 
    "Transfer Library": "Transfereix la llibreria", 
    "Trash": "Paperera", 
    "Unshare": "Elimina compartici\u00f3", 
    "Unshare Library": "Deixa de compartir la llibreria", 
    "Unstar": "No destaquis", 
    "Update": "Actualitza", 
    "Upload": "Puja", 
    "Upload Files": "Puja fitxers", 
    "Upload Link": "Enlla\u00e7 de pujada", 
    "Upload Links": "Enlla\u00e7os de pujada", 
    "Uploaded bytes exceed file size": "El total de bytes pujats \u00e9s superior a la mida del fitxer", 
    "Used:": "Actual:", 
    "Users": "Usuaris", 
    "View": "Mostra", 
    "Visits": "Visites", 
    "Wrong password": "La contrasenya no \u00e9s correcte", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "Podeu crear una llibreria per organitzar els vostres fitxers. Per exemple, podeu crear una llibreria nova per cada projecte i sincronitzar-les de forma independent.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "Pot compartir una llibreria clicant a \"Crea una llibreria\" o b\u00e9 a la icona \"Comparteix\" del llistat.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "Pots compartir aquest enlla\u00e7 amb qui vulguis i podr\u00e0 penjar fitxers directament en aquest directori.", 
    "You have not created any libraries": "No podeu crear cap llibreria", 
    "all members": "Tots el membres", 
    "days": "dies", 
    "icon": "icona", 
    "name": "nom", 
    "starred": "destacat", 
    "unstarred": "no destacat", 
    "you can also press \u2190 ": "tamb\u00e9 pots pr\u00e9mer \u2190"
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
    "DATETIME_FORMAT": "j \\d\\e F \\d\\e Y \\a \\l\\e\\s G:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%y %H:%M:%S", 
      "%d/%m/%y %H:%M:%S.%f", 
      "%d/%m/%y %H:%M", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j \\d\\e F \\d\\e Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j \\d\\e F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y G:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "G:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F \\d\\e\\l Y"
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


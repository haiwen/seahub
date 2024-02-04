

'use strict';
{
  const globals = this;
  const django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    const v = (n != 1);
    if (typeof v === 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  const newcatalog = {
    "(current notification)": "(notificaci\u00f3 actual)",
    "(current version)": "(versi\u00f3 actual)",
    "About": "Sobre",
    "About Us": "Sobre mi:",
    "Active": "Actiu",
    "Activities": "Activitat",
    "Add": "Afegeix",
    "Add Admins": "Afegeix administradors",
    "Add new notification": "Afegeix una notificaci\u00f3",
    "Added": "Afegit",
    "Admin": "Administra",
    "Admins": "Administradors",
    "All": "Tots",
    "All Groups": "Tots els grups",
    "All Notifications": "Totes les notificacions",
    "All Public Links": "Tot els enlla\u00e7os p\u00fablics",
    "All file types": "Tot tipus de fitxers",
    "Are you sure you want to delete %s ?": "Esteu segur que voleu eliminar %s ?",
    "Are you sure you want to restore this library?": "Esteu segur que voleu restaurar la llibreria?",
    "Audio": "So",
    "Avatar": "Avatar",
    "Avatar:": "Avatar:",
    "Can not copy directory %(src)s to its subdirectory %(des)s": "No es pot copiar el directori %(src)s al seu subdirectori %(des)s",
    "Can not move directory %(src)s to its subdirectory %(des)s": "No \u00e9s possible moure el directori %(src)s al subdirectori %(des)s",
    "Cancel": "Cancela",
    "Cancel All": "Cancel\u00b7la-ho tot",
    "Change": "Canvia",
    "Clear": "Buida ",
    "Clients": "Terminals",
    "Close": "Tanca",
    "Confirm Password": "Confirmeu la contrasenya",
    "Copy": "C\u00f2pia",
    "Count": "Compte",
    "Create": "Crea",
    "Created library": "S'ha creat la llibreria ",
    "Creator": "Autor",
    "Current Library": "Llibreria actual",
    "Current Path: ": "Ruta actual:",
    "Current path: ": "Ruta actual:",
    "Custom file types": "Certs tipus de fitxers",
    "Database": "base de dades",
    "Delete": "Elimina",
    "Delete Account": "Elimina el compte",
    "Delete Group": "Elimina el grup",
    "Delete Member": "Elimina membre",
    "Delete Notification": "Elimina la notificaci\u00f3",
    "Delete Organization": "Elimina la organitzaci\u00f3",
    "Delete Time": "Elimina la data",
    "Delete User": "Elimina l'usuari",
    "Deleted": "Eliminat",
    "Deleted directories": "Directoris eliminats",
    "Deleted files": "Fitxers eliminats",
    "Description": "Descripci\u00f3",
    "Description is required": "La descripci\u00f3 \u00e9s obligat\u00f2ria",
    "Detail": "Detalls",
    "Details": "Detalls",
    "Directory": "Directori",
    "Document convertion failed.": "S'ha produ\u00eft un error al convertir el document.",
    "Documents": "Documents",
    "Don't keep history": "No conservis l'historial",
    "Download": "Descarrega",
    "Edit": "Edita",
    "Edit succeeded": "S'ha actualitzat",
    "Email": "Correu electr\u00f2nic",
    "Encrypt": "Encripta",
    "Error": "Error",
    "Exit System Admin": "Surt de l'administrador de sistema",
    "Failed. Please check the network.": "Error. Verifiqueu la connexi\u00f3 a la xarxa",
    "File": "Fitxer",
    "Files": "Fitxers",
    "Folders": "Directoris",
    "Generate": "Genera",
    "Group": "Grup",
    "Groups": "Grups",
    "Help": "Ajuda",
    "History": "Historial",
    "IP": "IP",
    "Images": "Imatges",
    "In all libraries": "A totes les llibreries",
    "Inactive": "Inactiu",
    "Info": "Informaci\u00f3",
    "Input file extensions here, separate with ','": "Escrigui les extensions de fitxer separades per ','",
    "Internal Server Error": "S'ha produ\u00eft un error intern",
    "Invalid destination path": "La ruta de dest\u00ed no \u00e9s v\u00e0lida",
    "It is required.": "\u00c9s obligatori.",
    "Keep full history": "Conserva tot l'historial",
    "LDAP": "LDAP",
    "Last Update": "\u00daltima actualitzaci\u00f3",
    "Leave Share": "Deixa de compartir",
    "Libraries": "Llibreries",
    "Library": "Llibreria",
    "Links": "Enlla\u00e7os",
    "Log out": "Tanca la sessi\u00f3",
    "Members": "Membres",
    "Message": "Missatge",
    "Modification Details": "Detall de la modificaci\u00f3",
    "Modified": "Actualitzat",
    "Modified files": "Fitxers modificats",
    "Modifier": "Modifica",
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
    "No result": "Cap resultat",
    "None": "Cap",
    "Notification Detail": "Detalls de la notificaci\u00f3",
    "Notifications": "Notificacions",
    "Only keep a period of history:": "Nom\u00e9s conserva l'historial dels darrers:",
    "Operation succeeded.": "S'ha completat correctament.",
    "Operations": "Operacions",
    "Organization": "Organitzaci\u00f3",
    "Other Libraries": "Altres llibreries",
    "Owner": "Propietari",
    "Password": "Contrasenya",
    "Password again": "Repeteix la contrasenya",
    "Password is too short": "La contrasenya \u00e9s massa curta",
    "Password:": "Contrasenya:",
    "Passwords don't match": "Les contrasenyes no coincideixen",
    "Permission": "Perm\u00eds",
    "Permission denied": "S'ha denegat l'acc\u00e9s ",
    "Please check the network.": "Verifiqueu la connexi\u00f3 a la xarxa",
    "Please enter password": "Introdu\u00efu la contrasenya",
    "Please enter the password again": "Torneu a introduir la contrasenya",
    "Please input at least an email.": "Introdu\u00efu un correu electr\u00f2nic com a m\u00ednim.",
    "Previous": "Anterior",
    "Profile": "Perfil",
    "Profile Setting": "Configuraci\u00f3 ",
    "Read-Only": "Nom\u00e9s lectura",
    "Read-Write": "Lectura-Escriptura",
    "Really want to delete your account?": "Esteu segur que voleu eliminar el seu compte?",
    "Remove": "Elimina",
    "Rename": "Reanomena",
    "Rename File": "Reanomena el fitxer",
    "Renamed or Moved files": "Fitxers moguts o reanomenats",
    "ResetPwd": "ReiniContra",
    "Restore": "Restaura",
    "Restore Library": "Restaura la llibreria",
    "Result": "Resultat",
    "Revoke Admin": "Revoca el perm\u00eds d'administrador",
    "Saving...": "Guardant...",
    "Seafile": "Seafile",
    "Search": "Cerca",
    "Search Files": "Cerca fitxers",
    "Search files in this library": "Cerca fitxers a la llibreria",
    "Send": "Envia",
    "Send to:": "Envia a:",
    "Sending...": "Enviant...",
    "Server Version: ": "Versi\u00f3 del servidor:",
    "Set Admin": "Activa el perm\u00eds d'administrador",
    "Set Quota": "Estableix quota",
    "Set to current": "Estableix com a actual",
    "Settings": "Configuraci\u00f3",
    "Share": "Comparteix",
    "Share Admin": "Comparteix l'administraci\u00f3",
    "Share From": "Compartit desde",
    "Share To": "Comparteix amb",
    "Shared By": "Compartit per",
    "Shared by: ": "Compartit per:",
    "Size": "Mida",
    "Space Used": "Espai ocupat",
    "Star": "Destaca",
    "Status": "Estat",
    "Submit": "Envia",
    "Successfully copied %(name)s and %(amount)s other items.": "S'ha copiat %(name)s i %(amount)s m\u00e9s.",
    "Successfully copied %(name)s.": "S'ha copiat %(name)s.",
    "Successfully deleted %s": "S'ha eliminat %s",
    "Successfully moved %(name)s and %(amount)s other items.": "S'ha mogut %(name)s i %(amount)s m\u00e9s.",
    "Successfully moved %(name)s.": "S'ha mogut %(name)s.",
    "Successfully reset password to %(passwd)s for user %(user)s.": "S'ha reinicialitzat la contrasenya a %(passwd)s per l'usuari %(user)s.",
    "Successfully revoke the admin permission of %s": "S'ha revocat el perm\u00eds d'administrador a %s",
    "Sync": "Sincronitza",
    "System": "Sistema",
    "System Admin": "Administrador de sistema",
    "Text files": "Fitxers de text",
    "The owner of this library has run out of space.": "El propietari d'aquesta llibreria ha excedit el seu l\u00edmit de capacitat.",
    "The password will be kept in the server for only 1 hour.": "El servidor guardar\u00e0 la contrasenya nom\u00e9s 1 hora.",
    "This operation will not be reverted. Please think twice!": "Atenci\u00f3, aquesta operaci\u00f3 \u00e9s irreversible. ",
    "Time": "Data",
    "Tip: 0 means default limit": "Consell: El 0 equival al l\u00edmit per defecte",
    "Transfer": "Transfereix",
    "Transfer Library": "Transfereix la llibreria",
    "Trash": "Paperera",
    "Unknown": "Desconegut",
    "Unshare": "Elimina compartici\u00f3",
    "Unshare Library": "Deixa de compartir la llibreria",
    "Unstar": "No destaquis",
    "Update": "Actualitza",
    "Upload": "Puja",
    "Upload Files": "Puja fitxers",
    "Upload Link": "Enlla\u00e7 de pujada",
    "Upload Links": "Enlla\u00e7os de pujada",
    "Upload file": "Puja el fitxer",
    "Used:": "Actual:",
    "Users": "Usuaris",
    "Video": "V\u00eddeos",
    "View": "Mostra",
    "View Snapshot": "Visualitza la captura",
    "Visits": "Visites",
    "Wrong password": "La contrasenya no \u00e9s correcte",
    "ZIP": "ZIP",
    "all": "tot",
    "all members": "Tots el membres",
    "days": "dies",
    "icon": "icona",
    "name": "nom",
    "shared by:": "compartit per:",
    "starred": "destacat",
    "to": "a",
    "unstarred": "no destacat",
    "you can also press \u2190 ": "tamb\u00e9 pots pr\u00e9mer \u2190"
  };
  for (const key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      const value = django.catalog[msgid];
      if (typeof value === 'undefined') {
        return msgid;
      } else {
        return (typeof value === 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      const value = django.catalog[singular];
      if (typeof value === 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value.constructor === Array ? value[django.pluralidx(count)] : value;
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      let value = django.gettext(context + '\x04' + msgid);
      if (value.includes('\x04')) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      let value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.includes('\x04')) {
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
    "FIRST_DAY_OF_WEEK": 1,
    "MONTH_DAY_FORMAT": "j \\d\\e F",
    "NUMBER_GROUPING": 3,
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
      const value = django.formats[format_type];
      if (typeof value === 'undefined') {
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
};


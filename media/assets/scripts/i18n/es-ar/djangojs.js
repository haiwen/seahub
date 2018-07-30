

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
    "%curr% of %total%": "%curr% de %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">La imagen</a> no pudo ser cargada.", 
    "Add User": "Agregar Usuario", 
    "Added user {user}": "Usuario {user} agregado", 
    "Are you sure you want to clear trash?": "\u00bfSeguro que deseas vaciar la papelera?", 
    "Are you sure you want to delete %s ?": "\u00bfSeguro que quieres borrar %s ?", 
    "Are you sure you want to delete %s completely?": "\u00bfSeguro que deseas eliminar por completo %s?", 
    "Are you sure you want to delete all %s's libraries?": "\u00bfSeguro que deseas eliminar todas las bibliotecas de %s?", 
    "Are you sure you want to delete these selected items?": "\u00bfSeguro que deseas eliminar los elementos selecionados?", 
    "Are you sure you want to quit this group?": "\u00bfEst\u00e1s seguro que deseas abandonar el grupo?", 
    "Are you sure you want to restore %s?": "\u00bfSeguro que deseas restaurar %s?", 
    "Are you sure you want to unlink this device?": "\u00bfEst\u00e1s seguro que deseas desvincular este dispositivo?", 
    "Are you sure you want to unshare %s ?": "\u00bfEst\u00e1 seguro que desea dejar de compartir %s ?", 
    "Cancel": "Cancelar", 
    "Canceled.": "Cancelado.", 
    "Change Password of Library {placeholder}": "Cambiar Contrase\u00f1a de la Biblioteca {placeholder}", 
    "Clear Trash": "Vaciar Papelera", 
    "Close (Esc)": "Cerrar (Esc)", 
    "Copy selected item(s) to:": "Copiar item(s) seleccionados a:", 
    "Copy {placeholder} to:": "Copiar {placeholder} a:", 
    "Copying %(name)s": "Copiando %(name)s", 
    "Copying file %(index)s of %(total)s": "Copiando archivo %(index)s de %(total)s", 
    "Create Group": "Crear Grupo", 
    "Create Library": "Crear Biblioteca", 
    "Created group {group_name}": "Grupo {group_name} creado", 
    "Created library {library_name} with {owner} as its owner": "Biblioteca {library_name} creada con {owner} como su propietario", 
    "Delete": "Borrar", 
    "Delete Department": "Eliminar Departamento", 
    "Delete Group": "Borrar Grupo", 
    "Delete Items": "Eliminar elementos", 
    "Delete Library": "Eliminar Biblioteca", 
    "Delete Library By Owner": "Eliminar biblioteca por  propietario", 
    "Delete Member": "Eliminar Miembro", 
    "Delete User": "Eliminar usuario", 
    "Delete failed": "Eliminar fall\u00f3", 
    "Delete files from this device the next time it comes online.": "Eliminar archivos de este dispositivo la pr\u00f3xima vez que est\u00e9 en l\u00ednea.", 
    "Deleted directories": "Carpetas eliminadas", 
    "Deleted files": "Archivos eliminados", 
    "Deleted group {group_name}": "Grupo {group_name} eliminado", 
    "Deleted library {library_name}": "Biblioteca {library_name} eliminada", 
    "Deleted user {user}": "Usuario {user} eliminado", 
    "Dismiss Group": "Descartar Gupo", 
    "Edit failed": "Editar fall\u00f3", 
    "Empty file upload result": "Resultado de subida incompleto", 
    "Encrypted library": "Biblioteca encriptada", 
    "Error": "Error", 
    "Expired": "Expirado", 
    "Failed to copy %(name)s": "Fallo al copiar %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Fallo al eliminar %(name)s y %(amount)s otros \u00edtems.", 
    "Failed to delete %(name)s and 1 other item.": "Fallo al eliminar %(name)s y otro \u00edtem.", 
    "Failed to delete %(name)s.": "Fallo al eliminar %(name)s.", 
    "Failed to move %(name)s": "Fallo al mover %(name)s", 
    "Failed to send to {placeholder}": "Fallo al enviar a  {placeholder}", 
    "Failed.": "Fall\u00f3.", 
    "Failed. Please check the network.": "Fallo. Por favor, verifica la red.", 
    "File Upload canceled": "Subir archivo cancelado", 
    "File Upload complete": "Subir archivo completado", 
    "File Upload failed": "Subir archivo fall\u00f3", 
    "File Uploading...": "Subiendo archivo...", 
    "File is locked": "El archivo est\u00e1 bloqueado", 
    "File is too big": "Archivo demasiado grande", 
    "File is too small": "Archivo demasiado peque\u00f1o", 
    "Filetype not allowed": "Tipo de archivo no permitido", 
    "Hide": "Ocultar", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Error interno. Fallo al copiar %(name)s y %(amount)s otro(s) \u00edtem(s).", 
    "Internal error. Failed to copy %(name)s.": "Error interno. Fallo al copiar %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Error interno. Fallo al mover %(name)s y %(amount)s otro(s) \u00edtem(s).", 
    "Internal error. Failed to move %(name)s.": "Error interno. Fallo al mover %(name)s.", 
    "Invalid destination path": "Ruta de destino inv\u00e1lida", 
    "Invalid quota.": "Cuota inv\u00e1lida.", 
    "It is required.": "Es requerido.", 
    "Just now": "Ahora", 
    "Loading failed": "La carga fall\u00f3", 
    "Loading...": "Cargando...", 
    "Log in": "Ingresar", 
    "Maximum number of files exceeded": "N\u00famero m\u00e1ximo de archivos excedido", 
    "Modified files": "Archivos modificados", 
    "Move selected item(s) to:": "Mover item(s) seleccionados a:", 
    "Move {placeholder} to:": "Mover {placeholder} a:", 
    "Moving %(name)s": "Moviendo %(name)s", 
    "Moving file %(index)s of %(total)s": "Moviendo archivo  %(index)s de %(total)s", 
    "Name is required": "Nombre requerido", 
    "Name is required.": "Se requiere nombre.", 
    "Name should not include '/'.": "El nombre no debe contener ' / '.", 
    "New Department": "Nuevo Departamento", 
    "New Excel File": "Nuevo Archivo Excel", 
    "New File": "Nuevo archivo", 
    "New Markdown File": "Nuevo Archivo Markdown", 
    "New PowerPoint File": "Nuevo Archivo PowerPoint", 
    "New Sub-department": "Nuevo Sub-departamento", 
    "New Word File": "Nuevo Archivo Word", 
    "New directories": "Carpetas nuevas", 
    "New files": "Archivos nuevos", 
    "New password is too short": "La nueva contrase\u00f1a es demasiado corta", 
    "New passwords don't match": "Las contrase\u00f1as no coinciden", 
    "Next (Right arrow key)": "Siguiente (Flecha derecha)", 
    "No matches": "No hay coincidencias", 
    "Only an extension there, please input a name.": "Define un nombre, no solamente la extensi\u00f3n.", 
    "Open in New Tab": "Abrir en una nueva pesta\u00f1a", 
    "Packaging...": "Empaquetando...", 
    "Password is required.": "Contrase\u00f1a requerida", 
    "Password is too short": "Contrase\u00f1a demasiado corta", 
    "Passwords don't match": "Las contrase\u00f1as no coinciden", 
    "Permission error": "Error de permiso", 
    "Please check the network.": "Por favor verifique la red.", 
    "Please choose a CSV file": "Escoja  un archivo CSV", 
    "Please click and choose a directory.": "Por favor, seleccione una carpeta con un click.", 
    "Please enter 1 or more character": "Por favor ingrese uno o m\u00e1s caracteres", 
    "Please enter a new password": "Ingrese una nueva contrase\u00f1a", 
    "Please enter days.": "Por favor ingrese d\u00edas.", 
    "Please enter password": "Ingresa una contrase\u00f1a", 
    "Please enter the new password again": "Ingrese la nueva contrase\u00f1a otra vez", 
    "Please enter the old password": "Ingrese la contrase\u00f1a anterior", 
    "Please enter the password again": "Ingresa la contrase\u00f1a nuevamente", 
    "Please enter valid days": "Ingresa cantidad v\u00e1lida de d\u00edas", 
    "Please input at least an email.": "Ingresa al menos un correo.", 
    "Previous (Left arrow key)": "Anterior (Flecha izquierda)", 
    "Processing...": "Procesando\u2026", 
    "Quit Group": "Salir del grupo", 
    "Read-Only": "S\u00f3lo lectura", 
    "Read-Only library": "Biblioteca de s\u00f3lo lectura", 
    "Read-Write": "Lectura / Escritura", 
    "Read-Write library": "Biblioteca de lectura / escritura", 
    "Really want to dismiss this group?": "\u00bfSeguro que deseas descartar este grupo?", 
    "Refresh": "Refrescar", 
    "Removed all items from trash.": "Todos los items en la papelera eliminados.", 
    "Removed items older than {n} days from trash.": "Todos los items de m\u00e1s de {n} d\u00edas en la papelera eliminados.", 
    "Rename File": "Renombrar Archivo", 
    "Rename Folder": "Renombrar Carpeta", 
    "Renamed or Moved files": "Archivos movidos o renombrados", 
    "Replace file {filename}?": "\u00bfReemplazar archivo {filename}?", 
    "Restore Library": "Restaurar biblioteca", 
    "Saving...": "Guardando...", 
    "Search groups": "Buscar grupos", 
    "Search user or enter email and press Enter": "Buscar usuario o ingresar email y presionar Enter", 
    "Search users or enter emails and press Enter": "Buscar usuarios o ingresar emails y presionar Enter", 
    "Searching...": "Buscando...", 
    "Select a group": "Seleccione un grupo", 
    "Select groups": "Seleccionar grupos", 
    "Set {placeholder}'s permission": "Establecer permiso de  {placeholder}", 
    "Share {placeholder}": "Compartir {placeholder}", 
    "Show": "Mostrar", 
    "Start": "Inicio", 
    "Success": "\u00c9xito", 
    "Successfully added label(s) for library {placeholder}": "Etiqueta(s) agregada(s) con \u00e9xito para la biblioteca {placeholder}", 
    "Successfully changed library password.": "Contrase\u00f1a de la biblioteca cambiada con \u00e9xito.", 
    "Successfully clean all errors.": "Errores eliminados con \u00e9xito.", 
    "Successfully copied %(name)s": "Copiado con \u00e9xito %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s y otros %(amount)s elementos copiados con \u00e9xito.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s y 1 otro \u00edtem copiados con \u00e9xito.", 
    "Successfully copied %(name)s.": "%(name)s copiados con \u00e9xito.", 
    "Successfully deleted %(name)s": "Eliminados con \u00e9xito %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "%(name)s y otros %(amount)s elementos eliminados con \u00e9xito.", 
    "Successfully deleted %(name)s and 1 other item.": "eliminado con \u00e9xito %(name)s y otro \u00edtem.", 
    "Successfully deleted %(name)s.": "%(name)s eliminado con \u00e9xito.", 
    "Successfully deleted 1 item": "1 \u00edtem eliminado con \u00e9xito", 
    "Successfully deleted 1 item.": "1 \u00edtem eliminado con \u00e9xito", 
    "Successfully deleted library {placeholder}": "Biblioteca {placeholder} eliminada con \u00e9xito", 
    "Successfully deleted member {placeholder}": "Miembro {placeholder} eliminado con \u00e9xito", 
    "Successfully deleted.": "Eliminado con \u00e9xito.", 
    "Successfully imported.": "Importado con \u00e9xito.", 
    "Successfully invited %(email) and %(num) other people.": "%(email) y  otros %(num) invitados con \u00e9xito.", 
    "Successfully invited %(email).": "%(email) invitado con \u00e9xito.", 
    "Successfully modified permission": "Permiso modificado con \u00e9xito", 
    "Successfully moved %(name)s": "Movido con \u00e9xito %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s y otros %(amount)s elementos movidos con \u00e9xito.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s y 1 otro \u00edtem movidos con \u00e9xito.", 
    "Successfully moved %(name)s.": "%(name)s movido con \u00e9xito.", 
    "Successfully restored library {placeholder}": "Biblioteca {placeholder} restaurada con \u00e9xito", 
    "Successfully sent to {placeholder}": "Enviado con \u00e9xito a  {placeholder}", 
    "Successfully set library history.": "Historial de biblioteca establecido con \u00e9xito.", 
    "Successfully transferred the group.": "Grupo transferido con \u00e9xito.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Grupo transferido con \u00e9xito. Ahora eres un miembro normal del grupo.", 
    "Successfully transferred the library.": "Biblioteca transferida con \u00e9xito.", 
    "Successfully unlink %(name)s.": "Desvinculado exitosamente %(name)s.", 
    "Successfully unshared 1 item.": "Se dej\u00f3 de compartir 1 \u00edtem.", 
    "Successfully unshared library {placeholder}": "Se dej\u00f3 de compartir la biblioteca {placeholder} exitosamente", 
    "Successfully unstared {placeholder}": "Desmarcado con \u00e9xito {placeholder}", 
    "Tag should not include ','.": "El r\u00f3tulo no debe incluir ','.", 
    "Transfer Group": "Tranferir Grupo", 
    "Transfer Group {group_name} To": "Tranferir Grupo {group_name} a", 
    "Transfer Library": "Transferir Biblioteca", 
    "Transfer Library {library_name} To": "Transferir Biblioteca {library_name}  a", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Grupo {group_name} transferido de {user_from} a {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Biblioteca {library_name} transferida de  {user_from} a {user_to}", 
    "Unlink device": "Desvincular dispositivo", 
    "Unshare Library": "Dejar de compartir Biblioteca", 
    "Uploaded bytes exceed file size": "Bytes actuales exceden el tama\u00f1o m\u00e1ximo", 
    "You can only select 1 item": "S\u00f3lo puede seleccionar 1 \u00edtem", 
    "You cannot select any more choices": "No puede hacer m\u00e1s selecciones", 
    "You have logged out.": "Has terminado la sesi\u00f3n", 
    "canceled": "cancelado", 
    "locked by {placeholder}": "bloqueado por {placeholder}", 
    "uploaded": "subido", 
    "{placeholder} Folder Permission": "{placeholder} Permiso de Carpeta", 
    "{placeholder} History Setting": "{placeholder} Configuraci\u00f3n del historial", 
    "{placeholder} Members": "{placeholder} Miembros", 
    "{placeholder} Share Links": "{placeholder} Enlaces Compartidos"
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
    "DATETIME_FORMAT": "j N Y H:i", 
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
    "DATE_FORMAT": "j N Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j \\d\\e F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y H:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
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


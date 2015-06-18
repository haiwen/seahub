

(function (globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function (n) {
    var v=(n != 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  
  /* gettext library */

  django.catalog = {
    "%curr% of %total%": "%curr% de %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">La imagen</a> no pudo ser cargada.", 
    "Are you sure you want to delete these selected items?": "\u00bfEst\u00e1 seguro de eliminar los \u00edtems seleccionados?", 
    "Cancel": "Cancelar", 
    "Canceled.": "Cancelado.", 
    "Close (Esc)": "Cerrar (Esc)", 
    "Copy {placeholder} to:": "Copiar {placeholder} a:", 
    "Copying %(name)s": "Copiando %(name)s", 
    "Copying file %(index)s of %(total)s": "Copiando archivo %(index)s de %(total)s", 
    "Delete": "Eliminar", 
    "Delete Items": "Eliminar \u00cdtems", 
    "Delete succeeded.": "Eliminado con \u00e9xito.", 
    "Empty file upload result": "Archivo subido result\u00f3 vac\u00edo", 
    "Error": "Error", 
    "Failed to copy %(name)s": "Fallo al copiar %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Fallo al eliminar %(name)s y %(amount)s otros \u00edtems.", 
    "Failed to delete %(name)s and 1 other item.": "Fallo al eliminar %(name)s y otro \u00edtem.", 
    "Failed to delete %(name)s.": "Fallo al eliminar %(name)s.", 
    "Failed to get update url": "Fallo al obtener url de actualizaci\u00f3n", 
    "Failed to get upload url": "Fallo al obtener url de subida", 
    "Failed to move %(name)s": "Fallo al mover %(name)s", 
    "Failed to send to {placeholder}": "Fallo al enviar a  {placeholder}", 
    "Failed to share to {placeholder}": "Fallo al compartir con {placeholder}", 
    "Failed.": "Fall\u00f3.", 
    "Failed. Please check the network.": "Fallo. Por favor verifique la red.", 
    "File Upload canceled": "Subida de archivo cancelada", 
    "File Upload complete": "Archivo subido por completo", 
    "File Upload failed": "Subida de archivo fall\u00f3", 
    "File Uploading...": "Subiendo Archivo...", 
    "File is too big": "El archivo es demasiado grande.", 
    "File is too small": "El archivo es demasiado chico", 
    "Filetype not allowed": "Tipo de archivo no permitido", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Error interno. Fallo al copiar %(name)s y %(amount)s otro(s) \u00edtem(s).", 
    "Internal error. Failed to copy %(name)s.": "Error interno. Fallo al copiar  %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Error interno. Fallo al mover %(name)s y %(amount)s otro(s) \u00edtem(s).", 
    "Internal error. Failed to move %(name)s.": "Error interno. Fallo al mover %(name)s.", 
    "Invalid destination path": "Ruta de destino inv\u00e1lida", 
    "It is required.": "Es requerida.", 
    "Just now": "Ahora", 
    "Loading...": "Cargando...", 
    "Max number of files exceeded": "M\u00e1ximo n\u00famero de archivos excedido", 
    "Move {placeholder} to:": "Mover {placeholder} a:", 
    "Moving %(name)s": "Moviendo %(name)s", 
    "Moving file %(index)s of %(total)s": "Moviendo archivo %(index)s de %(total)s", 
    "Name is required": "Nombre es requerido", 
    "Next (Right arrow key)": "Siguiente (Flecha derecha)", 
    "Only an extension there, please input a name.": "S\u00f3lo hay una extensi\u00f3n, por favor ingrese un nombre.", 
    "Open in New Tab": "Abrir en una nueva pesta\u00f1a", 
    "Password is required.": "Se requiere contrase\u00f1a.", 
    "Password is too short": "La contrase\u00f1a es demasiado corta", 
    "Passwords don't match": "Las contrase\u00f1as no coinciden", 
    "Permission error": "Error de permiso", 
    "Please check the network.": "Por favor verifique la red.", 
    "Please choose a directory": "Por favor escoja una cerpeta", 
    "Please enter days.": "Por favor ingrese d\u00edas.", 
    "Please enter password": "Por favor ingrese la contrase\u00f1a", 
    "Please enter the password again": "Por favor ingrese la contrase\u00f1a nuevamente", 
    "Please enter valid days": "Por favor ingrese d\u00edas v\u00e1lidos", 
    "Please input at least an email.": "Por favor ingrese al menos un e-mail.", 
    "Please select a contact or a group.": "Por favor escoja un contacto o un grupo.", 
    "Previous (Left arrow key)": "Anterior (Flecha izquierda)", 
    "Processing...": "Proceasndo...", 
    "Really want to delete {lib_name}?": "\u00bfRealmente desea eliminar {lib_name}?", 
    "Rename Directory": "Renombrar Carpeta", 
    "Rename File": "Renombrar Archivo", 
    "Replace file {filename}?": "\u00bfReemplazar archivo {filename}?", 
    "Saving...": "Guardando...", 
    "Select groups": "Seleccionar grupos", 
    "Set {placeholder}'s permission": "Establecer permiso de  {placeholder}", 
    "Share {placeholder}": "Compartir {placeholder}", 
    "Start": "Iniciar", 
    "Success": "\u00c9xito", 
    "Successfully copied %(name)s and %(amount)s other items.": "Copiado con \u00e9xito %(name)s y %(amount)s otros \u00edtems.", 
    "Successfully copied %(name)s and 1 other item.": "Copiado con \u00e9xito %(name)s y otro \u00edtem.", 
    "Successfully copied %(name)s.": "Copiado con \u00e9xito %(name)s.", 
    "Successfully deleted %(name)s": "Eliminado con \u00e9xito %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "eliminado con \u00e9xito %(name)s y %(amount)s otros \u00edtems.", 
    "Successfully deleted %(name)s and 1 other item.": "eliminado con \u00e9xito %(name)s y otro \u00edtem.", 
    "Successfully deleted %(name)s.": "Eliminado con \u00e9xito %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "Movido con \u00e9xito %(name)s y %(amount)s otros \u00edtems.", 
    "Successfully moved %(name)s and 1 other item.": "Movido con \u00e9xito %(name)s y otro \u00edtem.", 
    "Successfully moved %(name)s.": "Movido con \u00e9xito %(name)s.", 
    "Successfully sent to {placeholder}": "Enviado con \u00e9xito a {placeholder}", 
    "Successfully shared to {placeholder}": "Compartido con \u00e9xito con  {placeholder}", 
    "Successfully unshared {placeholder}": "Dejado de compartir con \u00e9xito {placeholder}", 
    "Successfully unstared {placeholder}": "Desmarcado con \u00e9xito {placeholder}", 
    "Uploaded bytes exceed file size": "La cantidad de bytes subidos excede el tama\u00f1o del archivo", 
    "You don't have any library at present.": "En este momento no posee ninguna biblioteca.", 
    "You have not renamed it.": "No lo ha renombrado.", 
    "canceled": "cancelado", 
    "uploaded": "subido"
  };

  django.gettext = function (msgid) {
    var value = django.catalog[msgid];
    if (typeof(value) == 'undefined') {
      return msgid;
    } else {
      return (typeof(value) == 'string') ? value : value[0];
    }
  };

  django.ngettext = function (singular, plural, count) {
    var value = django.catalog[singular];
    if (typeof(value) == 'undefined') {
      return (count == 1) ? singular : plural;
    } else {
      return value[django.pluralidx(count)];
    }
  };

  django.gettext_noop = function (msgid) { return msgid; };

  django.pgettext = function (context, msgid) {
    var value = django.gettext(context + '\x04' + msgid);
    if (value.indexOf('\x04') != -1) {
      value = msgid;
    }
    return value;
  };

  django.npgettext = function (context, singular, plural, count) {
    var value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
    if (value.indexOf('\x04') != -1) {
      value = django.ngettext(singular, plural, count);
    }
    return value;
  };
  

  django.interpolate = function (fmt, obj, named) {
    if (named) {
      return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
    } else {
      return fmt.replace(/%s/g, function(match){return String(obj.shift())});
    }
  };


  /* formatting library */

  django.formats = {
    "DATETIME_FORMAT": "j \\d\\e F \\d\\e Y \\a \\l\\a\\s H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%y %H:%M:%S", 
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
      "%Y%m%d", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ".", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j \\d\\e F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y H:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "H:i:s", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F \\d\\e Y"
  };

  django.get_format = function (format_type) {
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

}(this));


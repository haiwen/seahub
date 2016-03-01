

(function (globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function (n) {
    var v=(n > 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  
  /* gettext library */

  django.catalog = {
    "%curr% of %total%": "%curr% do %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">A imagem</a> n\u00e3o pode ser carregada.", 
    "Are you sure you want to delete these selected items?": "Tem certeza que deseja deletar  os items selecionados?", 
    "Cancel": "Cancelar", 
    "Canceled.": "Cancelados", 
    "Close (Esc)": "Fechar(Esc)", 
    "Copy {placeholder} to:": "Copiar {placeholder} para:", 
    "Copying %(name)s": "Copiando %(name)s", 
    "Copying file %(index)s of %(total)s": "Copiando %(index) arquivos de %(total)s", 
    "Delete": "Deletar", 
    "Delete Items": "Deletar items", 
    "Delete failed": "Dele\u00e7\u00e3o falhou", 
    "Delete succeeded.": "Dele\u00e7\u00e3o Efetuada", 
    "Edit failed": "Edi\u00e7\u00e3o falhou", 
    "Empty file upload result": "Resultado do carregamento de arquivos vazio", 
    "Error": "Erro", 
    "Failed to copy %(name)s": "Falha ao copiar %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Falha ao deletar %(name)s e %(amount)s outros items.", 
    "Failed to delete %(name)s and 1 other item.": "Falha ao deletar %(name)s e 1 outro items", 
    "Failed to delete %(name)s.": "Falha ao deletar %(name)s.", 
    "Failed to get update url": "Falha ao obter o URL de atualiza\u00e7\u00e3o", 
    "Failed to get upload url": "Falha ao obter o URL de envio", 
    "Failed to move %(name)s": "Falha ao mover %(name)s", 
    "Failed to send to {placeholder}": "Falha ao enviar para  {placeholder}", 
    "Failed to share to {placeholder}": "Falha ao compartilhar {placeholder}", 
    "Failed.": "Falhou", 
    "Failed. Please check the network.": "Falha. Por favor, verifique a rede.", 
    "File Upload canceled": "Carregamento de Arquivo cancelado", 
    "File Upload complete": "Carregamento de Arquivo completo", 
    "File Upload failed": "Carregamento de Arquivo falhou", 
    "File Uploading...": "Carregando Arquivo...", 
    "File is locked": "Arquivo est\u00e1 bloqueado", 
    "File is too big": "Arquivo muito grande", 
    "File is too small": "Arquivo muito pequeno", 
    "Filetype not allowed": "Tipo de arquivo n\u00e3o permitido", 
    "Hide": "Esconder", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Erro intero. Falha ao copiar %(name)s e %(amount)s outros item(s).", 
    "Internal error. Failed to copy %(name)s.": "Erro interno. Falha ao copiar  %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Erro interno. Falha ao mover %(name)s e %(amount)s outros item(s).", 
    "Internal error. Failed to move %(name)s.": "Erro interno. Falha ao mover %(name)s.", 
    "Invalid destination path": "Caminho de destino inv\u00e1lido", 
    "It is required.": "Obrigatorio", 
    "Just now": "Agora mesmo", 
    "Loading...": "Carregando...", 
    "Max number of files exceeded": "Numero maximo de arquivos excedido", 
    "Move {placeholder} to:": "Mover {placeholder} para:", 
    "Moving %(name)s": "Movendo %(name)s", 
    "Moving file %(index)s of %(total)s": "Movendo %(index) arquivos de %(total)s", 
    "Name is required": "Nome requerido", 
    "Next (Right arrow key)": "Proximo (Seta para a direita)", 
    "Only an extension there, please input a name.": "H\u00e1 apenas uma extens\u00e3o aqui, por favor, insira um nome.", 
    "Open in New Tab": "Abrir Nova Aba", 
    "Password is required.": "Senha obrigatoria", 
    "Password is too short": "Senha muito curta", 
    "Passwords don't match": "Senhas n\u00e3o coincidem", 
    "Permission error": "Erro de Permiss\u00e3o", 
    "Please check the network.": "Por favor ", 
    "Please choose a directory": "Por favor escolha o diretorio", 
    "Please enter days.": "Por favor insira os dias", 
    "Please enter password": "Por favor insira a senha", 
    "Please enter the password again": "Por favor insira a senha novamente", 
    "Please enter valid days": "Por favor insira dias validos", 
    "Please input at least an email.": "Por favor, insira pelo menos um e-mail.", 
    "Previous (Left arrow key)": "Voltar (Seta para a esquerda)", 
    "Processing...": "Processando...", 
    "Really want to delete {lib_name}?": "Realmente deseja deletar  {lib_name}?", 
    "Replace file {filename}?": "Substituir arquivo {filename}?", 
    "Saving...": "Salvando...", 
    "Search users or enter emails": "Busca por usuarios ou Digite emails", 
    "Select groups": "Selecionar grupos", 
    "Set {placeholder}'s permission": "Setar {placeholder}'s  permiss\u00e3o", 
    "Share {placeholder}": "Compartilhar {placeholder}", 
    "Show": "Mostrar", 
    "Start": "Iniciar", 
    "Success": "Sucesso", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s and %(amount)s outros items.copiados com sucesso", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s  copiado com sucesso e  1 outro items", 
    "Successfully copied %(name)s.": " %(name)s. copiados com sucesso", 
    "Successfully deleted %(name)s": "%(name)s Deletado com sucesso", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Exclu\u00edda com \u00eaxito% (name)s e %(amount) s outros itens.", 
    "Successfully deleted %(name)s and 1 other item.": "Deletado com sucesso %(name)s.", 
    "Successfully deleted %(name)s.": "%(name)s. Deletado com sucesso ", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s e %(amount)s outros items.copiados com sucesso", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s e  1 outro item.copiados com sucesso", 
    "Successfully moved %(name)s.": "Movidos com sucesso %(name)s.", 
    "Successfully sent to {placeholder}": "Enviado com sucesso para {placeholder}", 
    "Successfully unshared {placeholder}": "{placeholder} desmarcado com sucesso", 
    "Successfully unstared {placeholder}": "{placeholder} desmarcado com sucesso", 
    "Uploaded bytes exceed file size": "Bytes enviados excedem o tamanho do arquivo", 
    "You don't have any library at present.": "Voc\u00ea n\u00e3o tem nenhuma biblioteca agora", 
    "canceled": "Cancelado", 
    "locked by {placeholder}": "Bloqueado por {placeholder}", 
    "uploaded": "Carregado"
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
    "DATETIME_FORMAT": "j \\d\\e F \\d\\e Y \u00e0\\s H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%d/%m/%y %H:%M:%S", 
      "%d/%m/%y %H:%M", 
      "%d/%m/%y", 
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
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j \\d\\e F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y H:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "H:i", 
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


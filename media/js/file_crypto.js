importScripts('CryptoJS/rollups/aes.js');
importScripts('CryptoJS/rollups/sha1.js');
importScripts('CryptoJS/components/lib-typedarrays-min.js');

self.onmessage = function (e) {
    if (e.data.encrypt) {
        encrypt(e);
    } else {
        decrypt(e);
    }
}

function encrypt(e) {
    var encrypted = {index: e.data.index};
    var fReader = new FileReaderSync();
    var block = fReader.readAsArrayBuffer(e.data.block),
        key = e.data.key,
        iv = e.data.iv;

    try {
        var enc_obj = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(block), CryptoJS.enc.Hex.parse(key), {iv: CryptoJS.enc.Hex.parse(iv)});
        encrypted.block = enc_obj.ciphertext;
        encrypted.block_id = CryptoJS.SHA1(enc_obj.ciphertext).toString(CryptoJS.enc.Hex);
        postMessage(encrypted);
    } catch (e){
        // Error. return the index for debug.
        postMessage(encrypted.index);
    }
}

function decrypt(e) {
    var decrypted = {index: e.data.index};
    var block = e.data.block,
        key = e.data.key,
        iv = e.data.iv;

    try {
        var d_block = CryptoJS.AES.decrypt(CryptoJS.lib.WordArray.create(block).toString(CryptoJS.enc.Base64), CryptoJS.enc.Hex.parse(key), {iv: CryptoJS.enc.Hex.parse(iv)});
        decrypted.block = d_block;
        postMessage(decrypted);
    } catch (e){
        postMessage("Error");
    }
}

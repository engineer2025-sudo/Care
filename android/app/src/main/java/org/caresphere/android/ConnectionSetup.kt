package org.caresphere.android
/** QR metadata only. Never includes records, the encryption key or passphrase. */
object ConnectionSetup {
    fun encode(address:String,code:String):String { LocalTransferWire.endpoint(address,code);require(address==address.trim());return "CARESPHERE-CONNECT-1|$address|$code" }
    fun parse(value:String):Pair<String,String>{
        require(value.length<=100)
        val fields=value.split('|');require(fields.size==3 && fields[0]=="CARESPHERE-CONNECT-1")
        require(encode(fields[1],fields[2])==value)
        return fields[1] to fields[2]
    }
}

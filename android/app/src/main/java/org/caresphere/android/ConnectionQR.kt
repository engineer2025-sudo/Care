package org.caresphere.android
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.google.zxing.*
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeWriter
object ConnectionQR {
    fun image(address:String,code:String):Bitmap{
        val matrix=QRCodeWriter().encode(ConnectionSetup.encode(address,code),BarcodeFormat.QR_CODE,640,640)
        val pixels=IntArray(640*640){i->if(matrix[i%640,i/640])android.graphics.Color.BLACK else android.graphics.Color.WHITE}
        return Bitmap.createBitmap(pixels,640,640,Bitmap.Config.ARGB_8888)
    }
    fun read(bytes:ByteArray):Pair<String,String>{
        require(bytes.size<=10_000_000)
        val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
        require(bounds.outWidth in 1..16000 && bounds.outHeight in 1..16000)
        var sample=1;while(maxOf(bounds.outWidth,bounds.outHeight)/sample>1600)sample*=2
        val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,BitmapFactory.Options().apply{inSampleSize=sample})?:throw IllegalArgumentException()
        try{
            val pixels=IntArray(bitmap.width*bitmap.height);bitmap.getPixels(pixels,0,bitmap.width,0,0,bitmap.width,bitmap.height)
            val source=RGBLuminanceSource(bitmap.width,bitmap.height,pixels)
            val result=MultiFormatReader().decode(BinaryBitmap(HybridBinarizer(source)),mapOf(DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),DecodeHintType.TRY_HARDER to true))
            return ConnectionSetup.parse(result.text)
        }finally{bitmap.recycle()}
    }
}

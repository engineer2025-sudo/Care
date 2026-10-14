package org.caresphere.android

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.File

/** Narrow, read-only temporary URI grants for files deliberately sent in the share sheet. */
class TransferFileProvider : ContentProvider() {
    override fun onCreate() = true
    private fun file(uri: Uri): File {
        require(uri.authority == context!!.packageName + ".transfer")
        require(uri.pathSegments.size == 1)
        val name = uri.lastPathSegment ?: throw IllegalArgumentException()
        require(Regex("[a-fA-F0-9-]{36}\\.caretransfer").matches(name))
        val root = File(context!!.cacheDir,"transfers").canonicalFile
        val result = File(root,name).canonicalFile
        require(result.parentFile == root && result.isFile)
        return result
    }
    override fun getType(uri: Uri) = "application/json"
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor { require(mode == "r");return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.MODE_READ_ONLY) }
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        val file = file(uri)
        val columns = (projection?.toList() ?: listOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)).filter { it == OpenableColumns.DISPLAY_NAME || it == OpenableColumns.SIZE }
        return MatrixCursor(columns.toTypedArray(),1).apply { addRow(columns.map { if(it == OpenableColumns.DISPLAY_NAME)file.name else file.length() }) }
    }
    override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException()
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = throw UnsupportedOperationException()
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = throw UnsupportedOperationException()
}

# Google Drive / HTTP client
-keep class com.google.api.** { *; }
-keep class com.google.http.** { *; }
-keep class com.google.gson.** { *; }
-dontwarn com.google.api.**
-dontwarn com.google.http.**

# Moshi / Kotlin reflection
-keep class com.squareup.moshi.** { *; }
-keepclassmembers class ** {
    @com.squareup.moshi.FromJson *;
    @com.squareup.moshi.ToJson *;
}

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.**

# Hilt
-dontwarn dagger.hilt.**
-keep class dagger.hilt.** { *; }

# NFC
-keep class android.nfc.** { *; }

# Keep data classes for serialisation
-keep class com.plantnfc.domain.model.** { *; }
-keep class com.plantnfc.data.local.entities.** { *; }

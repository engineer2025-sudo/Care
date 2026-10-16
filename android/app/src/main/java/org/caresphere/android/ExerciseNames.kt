package org.caresphere.android

/** Maps Health Connect exercise types to catalog keys; unknown types stay honest. */
object ExerciseNames {
    fun key(type: Int): String = when (type) {
        androidx.health.connect.client.records.ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "Walk"
        androidx.health.connect.client.records.ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "Run"
        androidx.health.connect.client.records.ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "Bike"
        androidx.health.connect.client.records.ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "Strength training"
        androidx.health.connect.client.records.ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING -> "Swimming"
        else -> "Other exercise"
    }
}

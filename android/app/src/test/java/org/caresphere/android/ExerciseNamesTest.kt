package org.caresphere.android

import androidx.health.connect.client.records.ExerciseSessionRecord
import org.junit.Assert.assertEquals
import org.junit.Test

class ExerciseNamesTest {
    @Test fun commonTypesMapToCatalogKeys() {
        assertEquals("Walk", ExerciseNames.key(ExerciseSessionRecord.EXERCISE_TYPE_WALKING))
        assertEquals("Run", ExerciseNames.key(ExerciseSessionRecord.EXERCISE_TYPE_RUNNING))
        assertEquals("Bike", ExerciseNames.key(ExerciseSessionRecord.EXERCISE_TYPE_BIKING))
        assertEquals("Strength training", ExerciseNames.key(ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING))
        assertEquals("Swimming", ExerciseNames.key(ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING))
    }

    @Test fun unknownTypesStayHonest() {
        assertEquals("Other exercise", ExerciseNames.key(ExerciseSessionRecord.EXERCISE_TYPE_MEDITATION))
        assertEquals("Other exercise", ExerciseNames.key(9999))
    }
}

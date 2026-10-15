package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class LockSessionTest {
    @Test fun newSessionIsLocked(){assertFalse(LockSession().unlocked)}
    @Test fun onlyVerifiedForegroundAttemptUnlocks(){val s=LockSession();val id=s.begin();assertFalse(s.complete(id,false,true));assertFalse(s.complete(id,true,false));assertFalse(s.unlocked);assertTrue(s.complete(id,true,true));assertTrue(s.unlocked)}
    @Test fun cancelledAndReplacedAttemptsCannotUnlock(){val s=LockSession();val old=s.begin();s.invalidate();assertFalse(s.complete(old,true,true));val newer=s.begin();assertFalse(s.complete(old,true,true));assertTrue(s.complete(newer,true,true));assertFalse(s.complete(newer,true,true))}
    @Test fun backgroundLocksAndInvalidates(){val s=LockSession();val id=s.begin();s.lock();assertFalse(s.complete(id,true,true));assertFalse(s.unlocked);val next=s.begin();assertTrue(s.complete(next,true,true));s.lock();assertFalse(s.unlocked)}
}

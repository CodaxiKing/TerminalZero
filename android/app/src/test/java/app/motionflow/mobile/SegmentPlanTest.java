package app.motionflow.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class SegmentPlanTest {
    @Test public void keepsShortTail() { var p = SegmentPlan.create(12000); assertEquals(3, p.size()); assertEquals(10000, p.get(2).startMs()); assertEquals(2000, p.get(2).durationMs()); }
    @Test public void exactMultiples() { assertEquals(1, SegmentPlan.create(5000).size()); assertEquals(4, SegmentPlan.create(20000).size()); assertEquals(5, SegmentPlan.create(25000).size()); }
    @Test(expected = IllegalArgumentException.class) public void rejectsZero() { SegmentPlan.create(0); }
}

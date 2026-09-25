package app.motionflow.mobile;

import java.util.ArrayList;
import java.util.List;

public final class SegmentPlan {
    public record Part(long startMs, long durationMs) {}
    public static List<Part> create(long durationMs) {
        if (durationMs <= 0 || durationMs > 1800000) throw new IllegalArgumentException("Use um vídeo de até 30 minutos.");
        List<Part> parts = new ArrayList<>();
        for (long start = 0; start < durationMs; start += 5000) parts.add(new Part(start, Math.min(5000, durationMs - start)));
        return parts;
    }
}

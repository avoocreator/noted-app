package app.noted.mobile;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

public final class NotedData {
  static final String[] DAYS = {"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"};
  static final String[] MONTHS = {"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"};

  public static final class Item {
    String id = "";
    String title = "";
    String subject = "";
    String kind = "tugas";
    String due = "";
    String time = "";
    boolean done;
    boolean late;
  }

  private NotedData() {}

  private static String read(File f) throws Exception {
    try (FileInputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buf = new byte[8192];
      int n;
      while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
      return out.toString(StandardCharsets.UTF_8.name());
    }
  }

  static JSONObject load(Context c) {
    JSONObject best = null;
    long bestRev = -1;
    for (String name : new String[] {"noted-0.json", "noted-1.json"}) {
      try {
        File f = new File(c.getFilesDir(), name);
        if (!f.exists()) continue;
        JSONObject o = new JSONObject(read(f));
        if (o.optJSONArray("tasks") == null) continue;
        long rev = o.optLong("rev", 0);
        if (rev > bestRev) { best = o; bestRev = rev; }
      } catch (Exception ignored) { /* slot rusak: dilewati */ }
    }
    return best;
  }

  public static synchronized boolean toggleTask(Context c, String taskId) {
    if (c == null || taskId == null || taskId.trim().isEmpty()) return false;
    JSONObject db = load(c);
    if (db == null) return false;
    JSONArray tasks = db.optJSONArray("tasks");
    if (tasks == null) return false;

    JSONObject target = null;
    for (int i = 0; i < tasks.length(); i++) {
      JSONObject t = tasks.optJSONObject(i);
      if (t != null && taskId.equals(t.optString("id", ""))) {
        target = t;
        break;
      }
    }
    if (target == null) return false;

    boolean wasDone = target.optBoolean("done", false);
    SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    isoFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
    String nowIso = isoFormat.format(new Date());

    if (wasDone) {
      target.put("done", false);
      target.remove("doneAt");
    } else {
      target.put("done", true);
      target.put("doneAt", nowIso);

      String recur = target.optString("recur", "");
      if ("day".equals(recur) || "week".equals(recur) || "month".equals(recur)) {
        JSONObject nextTask = createNextRecurringTask(target, recur, nowIso);
        if (nextTask != null) {
          tasks.put(nextTask);
        }
      }
    }

    long rev = db.optLong("rev", 0) + 1;
    db.put("rev", rev);

    String slot = (rev % 2 == 0) ? "noted-0.json" : "noted-1.json";
    File filesDir = c.getFilesDir();
    if (filesDir == null) return false;

    File targetFile = new File(filesDir, slot);
    File tempFile = new File(filesDir, slot + ".tmp");

    try (FileOutputStream out = new FileOutputStream(tempFile)) {
      byte[] bytes = db.toString().getBytes(StandardCharsets.UTF_8);
      out.write(bytes);
      out.flush();
      try {
        out.getFD().sync();
      } catch (Exception ignored) {}
    } catch (Exception e) {
      if (tempFile.exists()) tempFile.delete();
      return false;
    }

    if (!tempFile.renameTo(targetFile)) {
      if (targetFile.exists()) targetFile.delete();
      if (!tempFile.renameTo(targetFile)) {
        if (tempFile.exists()) tempFile.delete();
        return false;
      }
    }
    return true;
  }

  private static JSONObject createNextRecurringTask(JSONObject base, String recur, String nowIso) {
    try {
      String today = key(plusDays(0));
      String curDue = base.optString("due", today);
      String nextDue = advanceDue(curDue, recur, today);

      JSONObject next = new JSONObject();
      String newId = "id-" + Long.toString(System.currentTimeMillis(), 36) + Long.toString((long)(Math.random() * 0xFFFFFFL), 36);
      next.put("id", newId);
      next.put("title", base.optString("title", ""));
      if (base.has("subject")) next.put("subject", base.optString("subject"));
      next.put("kind", base.optString("kind", "tugas"));
      if (base.has("priority")) next.put("priority", base.optString("priority"));
      next.put("recur", recur);
      next.put("due", nextDue);
      if (base.has("time")) next.put("time", base.optString("time"));
      next.put("done", false);
      next.put("createdAt", nowIso);
      return next;
    } catch (Exception e) {
      return null;
    }
  }

  private static String advanceDue(String dueStr, String recur, String today) {
    Calendar cal = parseDate(dueStr);
    if (cal == null) cal = Calendar.getInstance();
    advanceOnce(cal, recur);
    String d = key(cal);
    for (int i = 0; i < 400 && d.compareTo(today) < 0; i++) {
      advanceOnce(cal, recur);
      d = key(cal);
    }
    return d;
  }

  private static void advanceOnce(Calendar cal, String recur) {
    if ("day".equals(recur)) cal.add(Calendar.DAY_OF_MONTH, 1);
    else if ("week".equals(recur)) cal.add(Calendar.DAY_OF_MONTH, 7);
    else if ("month".equals(recur)) cal.add(Calendar.MONTH, 1);
  }

  private static Calendar parseDate(String s) {
    if (s == null || s.length() != 10) return null;
    try {
      int y = Integer.parseInt(s.substring(0, 4));
      int m = Integer.parseInt(s.substring(5, 7)) - 1;
      int d = Integer.parseInt(s.substring(8, 10));
      Calendar c = Calendar.getInstance();
      c.set(y, m, d, 0, 0, 0);
      c.set(Calendar.MILLISECOND, 0);
      return c;
    } catch (Exception e) {
      return null;
    }
  }

  static String key(Calendar c) {
    return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
  }

  static Calendar plusDays(int n) {
    Calendar c = Calendar.getInstance();
    c.add(Calendar.DAY_OF_MONTH, n);
    return c;
  }

  static String label(Calendar c) {
    return DAYS[c.get(Calendar.DAY_OF_WEEK) - 1] + ", " + c.get(Calendar.DAY_OF_MONTH) + " " + MONTHS[c.get(Calendar.MONTH)];
  }

  private static Item item(JSONObject t, String today) {
    Item it = new Item();
    it.id = t.optString("id", "");
    it.title = t.optString("title", "").trim();
    it.subject = t.optString("subject", "");
    it.kind = t.optString("kind", "tugas");
    it.due = t.optString("due", "");
    it.time = t.optString("time", "");
    it.done = t.optBoolean("done", false);
    it.late = !it.due.isEmpty() && it.due.compareTo(today) < 0;
    return it;
  }

  private static final Comparator<Item> BY_DUE = new Comparator<Item>() {
    @Override public int compare(Item a, Item b) {
      int d = (a.done ? 1 : 0) - (b.done ? 1 : 0);
      if (d != 0) return d;
      d = a.due.compareTo(b.due);
      if (d != 0) return d;
      d = (a.time.isEmpty() ? "99" : a.time).compareTo(b.time.isEmpty() ? "99" : b.time);
      return d != 0 ? d : a.title.compareToIgnoreCase(b.title);
    }
  };

  static List<Item> tomorrow(JSONObject db) {
    List<Item> out = new ArrayList<>();
    if (db == null) return out;
    String today = key(plusDays(0)), tmr = key(plusDays(1));
    JSONArray tasks = db.optJSONArray("tasks");
    for (int i = 0; tasks != null && i < tasks.length(); i++) {
      JSONObject t = tasks.optJSONObject(i);
      if (t == null) continue;
      Item it = item(t, today);
      if (tmr.equals(it.due) && !it.title.isEmpty()) out.add(it);
    }
    Collections.sort(out, BY_DUE);
    return out;
  }

  static List<Item> today(JSONObject db) {
    List<Item> out = new ArrayList<>();
    if (db == null) return out;
    String today = key(plusDays(0));
    JSONArray tasks = db.optJSONArray("tasks");
    for (int i = 0; tasks != null && i < tasks.length(); i++) {
      JSONObject t = tasks.optJSONObject(i);
      if (t == null) continue;
      Item it = item(t, today);
      if (!it.done && !it.due.isEmpty() && it.due.compareTo(today) <= 0 && !it.title.isEmpty()) out.add(it);
    }
    Collections.sort(out, BY_DUE);
    return out;
  }

  static List<String> subjects(JSONObject db, int dow) {
    Set<String> set = new LinkedHashSet<>();
    JSONArray sched = db == null ? null : db.optJSONArray("schedule");
    JSONArray day = sched == null ? null : sched.optJSONArray(dow);
    for (int i = 0; day != null && i < day.length(); i++) {
      String s = day.optString(i, "").trim();
      if (!s.isEmpty()) set.add(s);
    }
    return new ArrayList<>(set);
  }

  static boolean hasSchedule(JSONObject db) {
    JSONArray sched = db == null ? null : db.optJSONArray("schedule");
    for (int d = 0; sched != null && d < sched.length(); d++) {
      JSONArray day = sched.optJSONArray(d);
      if (day != null && day.length() > 0) return true;
    }
    return false;
  }
}

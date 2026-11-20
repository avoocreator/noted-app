package app.noted.mobile;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Membaca data Noted (noted-0/1.json di folder files) dan menyiapkan isi widget. */
final class NotedData {
  static final String[] DAYS = {"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"};
  static final String[] MONTHS = {"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"};

  static final class Item {
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

  /** Salinan valid dengan rev tertinggi, atau null bila belum ada data. */
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

  /** Semua tugas yang tenggatnya besok (termasuk yang sudah dicentang), belum selesai di depan. */
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

  /** Tugas belum selesai yang jatuh tempo hari ini atau sudah lewat. */
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

  /** Mapel pada jadwal untuk hari dengan indeks Calendar.DAY_OF_WEEK-1 (0 = Minggu). */
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

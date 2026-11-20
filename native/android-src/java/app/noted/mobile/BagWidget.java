package app.noted.mobile;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/** Widget "Tas Besok": mapel besok + yang harus dibawa/dikumpul. */
public class BagWidget extends WidgetBase {
  @Override void render(Context c, AppWidgetManager m, int id) {
    JSONObject db = NotedData.load(c);
    Calendar tmr = NotedData.plusDays(1);
    List<NotedData.Item> items = NotedData.tomorrow(db);
    List<String> subj = NotedData.subjects(db, tmr.get(Calendar.DAY_OF_WEEK) - 1);
    List<CharSequence> rows = new ArrayList<>();
    boolean allDone = !items.isEmpty();
    for (NotedData.Item it : items) { rows.add(row(it, false)); if (!it.done) allDone = false; }

    String sub = subj.isEmpty() ? "" : android.text.TextUtils.join(" · ", subj);
    String empty;
    if (db == null) empty = "Buka Noted untuk mulai.";
    else if (!NotedData.hasSchedule(db)) empty = "Isi jadwal pelajaran di Noted supaya Tas Besok tahu pelajaran besok.";
    else empty = "Belum ada yang perlu disiapkan.";

    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_bag);
    fill(c, v, "Tas Besok", NotedData.label(tmr), sub, rows, rowsFor(m, id), allDone ? "Tas siap ✓" : "", empty);
    m.updateAppWidget(id, v);
  }
}

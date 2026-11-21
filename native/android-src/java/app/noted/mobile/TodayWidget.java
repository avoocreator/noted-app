package app.noted.mobile;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.util.List;

public class TodayWidget extends WidgetBase {
  @Override void render(Context c, AppWidgetManager m, int id) {
    JSONObject db = NotedData.load(c);
    List<NotedData.Item> items = NotedData.today(db);
    int late = 0;
    for (NotedData.Item it : items) {
      if (it.late) late++;
    }

    String sub = items.isEmpty() ? "" : items.size() + " tugas" + (late > 0 ? " · " + late + " terlambat" : "");
    String empty = db == null ? "Buka Noted untuk mulai." : "Tidak ada tugas hari ini. Aman!";

    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today);
    fill(c, v, "Hari ini", NotedData.label(NotedData.plusDays(0)), sub, items, true, rowsFor(m, id), items.isEmpty() && db != null ? "Aman ✓" : "", empty);
    m.updateAppWidget(id, v);
  }
}

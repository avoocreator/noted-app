package app.noted.mobile;

import android.appwidget.AppWidgetManager;
import android.content.Context;

final class WidgetUpdater {
  private WidgetUpdater() {}

  /** Perbarui semua widget Noted yang ada di layar utama. */
  static void updateAll(Context c) {
    try {
      Context app = c.getApplicationContext();
      AppWidgetManager m = AppWidgetManager.getInstance(app);
      BagWidget bag = new BagWidget();
      for (int id : m.getAppWidgetIds(WidgetBase.comp(app, BagWidget.class))) bag.render(app, m, id);
      TodayWidget today = new TodayWidget();
      for (int id : m.getAppWidgetIds(WidgetBase.comp(app, TodayWidget.class))) today.render(app, m, id);
    } catch (Exception ignored) { /* widget tidak boleh membuat aplikasi gagal */ }
  }
}

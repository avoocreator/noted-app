package app.noted.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.StrikethroughSpan;
import android.text.style.StyleSpan;
import android.graphics.Typeface;
import android.widget.RemoteViews;
import java.util.List;

abstract class WidgetBase extends AppWidgetProvider {
  static final int INK = Color.parseColor("#15140F");
  static final int MUTED = Color.parseColor("#8015140F");
  static final int LATE = Color.parseColor("#B3261E");

  private static final int[] ROWS = {R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5};
  private static final int[] CHECKS = {R.id.check1, R.id.check2, R.id.check3, R.id.check4, R.id.check5};
  private static final int[] TEXTS = {R.id.text1, R.id.text2, R.id.text3, R.id.text4, R.id.text5};

  abstract void render(Context c, AppWidgetManager m, int id);

  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
    for (int id : ids) render(c, m, id);
  }

  @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle options) {
    render(c, m, id);
  }

  @Override public void onReceive(Context c, Intent i) {
    String a = i == null ? null : i.getAction();
    if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
      WidgetUpdater.updateAll(c);
      return;
    }
    super.onReceive(c, i);
  }

  static int rowsFor(AppWidgetManager m, int id) {
    int h = m.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 190);
    return Math.max(1, Math.min(5, (h - 108) / 36));
  }

  static CharSequence rowText(NotedData.Item it, boolean showDue) {
    SpannableStringBuilder b = new SpannableStringBuilder();
    b.append(it.title);
    int end = b.length();
    if (it.done) {
      b.setSpan(new StrikethroughSpan(), 0, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
      b.setSpan(new ForegroundColorSpan(MUTED), 0, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    String tag = "bawa".equals(it.kind) ? "bawa" : "kumpul".equals(it.kind) ? "kumpul" : it.subject;
    String extra = showDue && it.late ? "terlambat" : (showDue && !it.time.isEmpty() ? it.time : tag);
    if (extra != null && !extra.isEmpty()) {
      int s = b.length();
      b.append("  ").append(extra);
      b.setSpan(new ForegroundColorSpan(showDue && it.late ? LATE : MUTED), s, b.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
      if (showDue && it.late) b.setSpan(new StyleSpan(Typeface.BOLD), s, b.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    return b;
  }

  static void fill(Context c, RemoteViews v, String title, String date, String sub, List<NotedData.Item> items, boolean showDue, int max, String pill, String empty) {
    v.setTextViewText(R.id.title, title);
    v.setTextViewText(R.id.date, date);
    v.setTextViewText(R.id.sub, sub);
    v.setViewVisibility(R.id.sub, sub.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);

    Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    PendingIntent appPi = launch != null ? PendingIntent.getActivity(c, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT) : null;
    if (appPi != null) {
      v.setOnClickPendingIntent(R.id.widget_root, appPi);
    }

    int shown = Math.min(items.size(), max);
    for (int i = 0; i < ROWS.length; i++) {
      if (i < shown) {
        NotedData.Item it = items.get(i);
        v.setViewVisibility(ROWS[i], android.view.View.VISIBLE);

        v.setTextViewText(CHECKS[i], it.done ? "✓" : "○");
        if (it.id != null && !it.id.isEmpty()) {
          Intent toggleIntent = new Intent(c, WidgetActionReceiver.class);
          toggleIntent.setAction(WidgetActionReceiver.ACTION_TOGGLE_TASK);
          toggleIntent.putExtra(WidgetActionReceiver.EXTRA_TASK_ID, it.id);
          int reqCode = it.id.hashCode();
          PendingIntent togglePi = PendingIntent.getBroadcast(
              c,
              reqCode,
              toggleIntent,
              PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
          );
          v.setOnClickPendingIntent(CHECKS[i], togglePi);
        }

        v.setTextViewText(TEXTS[i], rowText(it, showDue));
        if (appPi != null) {
          v.setOnClickPendingIntent(TEXTS[i], appPi);
        }
      } else {
        v.setViewVisibility(ROWS[i], android.view.View.GONE);
      }
    }

    int more = items.size() - shown;
    v.setTextViewText(R.id.more, "+" + more + " lagi");
    v.setViewVisibility(R.id.more, more > 0 ? android.view.View.VISIBLE : android.view.View.GONE);
    v.setTextViewText(R.id.pill, pill);
    v.setViewVisibility(R.id.pill, pill.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
    v.setTextViewText(R.id.empty, empty);
    v.setViewVisibility(R.id.empty, items.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
  }

  static ComponentName comp(Context c, Class<?> k) { return new ComponentName(c, k); }
}

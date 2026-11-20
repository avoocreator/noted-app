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

/** Dasar kedua widget: tata letak sama (judul, tanggal, subjudul, baris, pil), isi berbeda. */
abstract class WidgetBase extends AppWidgetProvider {
  static final int INK = Color.parseColor("#15140F");
  static final int MUTED = Color.parseColor("#8015140F");
  static final int LATE = Color.parseColor("#B3261E");
  private static final int[] ROWS = {R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5};

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

  /** Banyak baris yang muat pada tinggi widget saat ini. */
  static int rowsFor(AppWidgetManager m, int id) {
    int h = m.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 190);
    return Math.max(1, Math.min(5, (h - 108) / 24));
  }

  static CharSequence row(NotedData.Item it, boolean showDue) {
    SpannableStringBuilder b = new SpannableStringBuilder();
    b.append(it.done ? "✓  " : "○  ");
    int start = b.length();
    b.append(it.title);
    int end = b.length();
    if (it.done) {
      b.setSpan(new StrikethroughSpan(), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
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

  static void fill(Context c, RemoteViews v, String title, String date, String sub, List<CharSequence> rows, int max, String pill, String empty) {
    v.setTextViewText(R.id.title, title);
    v.setTextViewText(R.id.date, date);
    v.setTextViewText(R.id.sub, sub);
    v.setViewVisibility(R.id.sub, sub.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
    int shown = Math.min(rows.size(), max);
    for (int i = 0; i < ROWS.length; i++) {
      if (i < shown) {
        v.setTextViewText(ROWS[i], rows.get(i));
        v.setViewVisibility(ROWS[i], android.view.View.VISIBLE);
      } else {
        v.setViewVisibility(ROWS[i], android.view.View.GONE);
      }
    }
    int more = rows.size() - shown;
    v.setTextViewText(R.id.more, "+" + more + " lagi");
    v.setViewVisibility(R.id.more, more > 0 ? android.view.View.VISIBLE : android.view.View.GONE);
    v.setTextViewText(R.id.pill, pill);
    v.setViewVisibility(R.id.pill, pill.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
    v.setTextViewText(R.id.empty, empty);
    v.setViewVisibility(R.id.empty, rows.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
    Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    if (launch != null) {
      PendingIntent pi = PendingIntent.getActivity(c, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
      v.setOnClickPendingIntent(R.id.widget_root, pi);
    }
  }

  static ComponentName comp(Context c, Class<?> k) { return new ComponentName(c, k); }
}

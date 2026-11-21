package app.noted.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class WidgetActionReceiver extends BroadcastReceiver {
  public static final String ACTION_TOGGLE_TASK = "app.noted.mobile.ACTION_TOGGLE_TASK";
  public static final String EXTRA_TASK_ID = "task_id";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (context == null || intent == null) return;
    String action = intent.getAction();
    if (ACTION_TOGGLE_TASK.equals(action)) {
      String taskId = intent.getStringExtra(EXTRA_TASK_ID);
      if (taskId != null && !taskId.trim().isEmpty()) {
        boolean success = NotedData.toggleTask(context, taskId);
        if (success) {
          WidgetUpdater.updateAll(context);
        }
      }
    }
  }
}

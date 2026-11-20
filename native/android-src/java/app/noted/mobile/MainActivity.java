package app.noted.mobile;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NotedWidgetPlugin.class);
    super.onCreate(savedInstanceState);
    handleSendIntent(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleSendIntent(intent);
  }

  private void handleSendIntent(Intent intent) {
    if (intent == null) return;
    String action = intent.getAction();
    if (Intent.ACTION_SEND.equals(action)) {
      CharSequence extra = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
      if (extra != null) {
        String text = extra.toString();
        if (!text.trim().isEmpty()) {
          NotedWidgetPlugin.setPendingSharedText(text);
        }
      }
    }
  }
}

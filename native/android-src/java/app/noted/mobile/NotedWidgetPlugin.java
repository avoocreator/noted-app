package app.noted.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Jembatan JS → native: pembaruan widget & penerimaan teks yang dibagikan (WhatsApp, dll). */
@CapacitorPlugin(name = "NotedWidget")
public class NotedWidgetPlugin extends Plugin {
  private static String pendingSharedText = null;
  private static NotedWidgetPlugin instance = null;

  @Override
  public void load() {
    super.load();
    instance = this;
    if (pendingSharedText != null) {
      emitSharedText(pendingSharedText);
    }
  }

  @Override
  protected void handleOnDestroy() {
    instance = null;
    super.handleOnDestroy();
  }

  public static synchronized void setPendingSharedText(String text) {
    if (text == null || text.trim().isEmpty()) return;
    pendingSharedText = text;
    if (instance != null) {
      instance.emitSharedText(text);
    }
  }

  private void emitSharedText(String text) {
    JSObject ret = new JSObject();
    ret.put("text", text);
    notifyListeners("sharedTextReceived", ret, true);
  }

  @PluginMethod
  public synchronized void getPendingSharedText(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("text", pendingSharedText != null ? pendingSharedText : "");
    pendingSharedText = null;
    call.resolve(ret);
  }

  @PluginMethod
  public void refresh(PluginCall call) {
    WidgetUpdater.updateAll(getContext());
    call.resolve();
  }
}

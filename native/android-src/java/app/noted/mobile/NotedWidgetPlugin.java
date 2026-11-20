package app.noted.mobile;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Jembatan JS → native: dipanggil setelah data disimpan agar widget ikut diperbarui. */
@CapacitorPlugin(name = "NotedWidget")
public class NotedWidgetPlugin extends Plugin {
  @PluginMethod
  public void refresh(PluginCall call) {
    WidgetUpdater.updateAll(getContext());
    call.resolve();
  }
}

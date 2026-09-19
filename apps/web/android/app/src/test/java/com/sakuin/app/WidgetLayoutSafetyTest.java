package com.sakuin.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.Test;

/**
 * Home-screen widgets are drawn by the launcher, which only accepts a short list of views.
 * APK 2.1.0 shipped font resources in the widget and showed "Tidak dapat memuat widget" on a
 * Xiaomi phone; this keeps every widget layout inside what all launchers can load.
 */
public class WidgetLayoutSafetyTest {
    private static final Path RES = Paths.get("src", "main", "res");
    private static final Path PROVIDER = Paths.get("src", "main", "java", "com", "sakuin", "app", "SakuinFinanceWidgetProvider.java");

    // RemoteViews classes available since API 22 (minSdk). Newer ones (CheckBox, Switch...) need API 31.
    private static final Set<String> ALLOWED_VIEWS = new HashSet<>(Arrays.asList(
            "FrameLayout", "LinearLayout", "RelativeLayout", "GridLayout", "AnalogClock", "Button",
            "Chronometer", "ImageButton", "ImageView", "ProgressBar", "TextView", "ViewFlipper",
            "ListView", "GridView", "StackView", "AdapterViewFlipper", "ViewStub"));

    private static String read(Path path) throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }

    private static Set<String> widgetLayouts() throws IOException {
        Set<String> layouts = new LinkedHashSet<>();
        for (String info : new String[] {"sakuin_finance_widget_info.xml", "sakuin_finance_widget_extra_info.xml"}) {
            Matcher matcher = Pattern.compile("android:(?:initialLayout|previewLayout)=\"@layout/(\\w+)\"")
                    .matcher(read(RES.resolve("xml").resolve(info)));
            while (matcher.find()) {
                layouts.add(matcher.group(1));
            }
        }
        assertFalse("No widget layouts found", layouts.isEmpty());
        return layouts;
    }

    /** A widget layout without its XML declaration and comments, which are not markup the launcher reads. */
    private static String readLayout(String layout) throws IOException {
        return read(RES.resolve("layout").resolve(layout + ".xml"))
                .replaceAll("<\\?xml[^>]*\\?>", "")
                .replaceAll("(?s)<!--.*?-->", "");
    }

    @Test
    public void widgetLayoutsUseOnlyLauncherSafeViews() throws IOException {
        for (String layout : widgetLayouts()) {
            String xml = readLayout(layout);
            Matcher tags = Pattern.compile("<([A-Za-z][\\w.]*)").matcher(xml);
            while (tags.find()) {
                assertTrue(layout + " uses <" + tags.group(1) + ">, which widgets cannot show",
                        ALLOWED_VIEWS.contains(tags.group(1)));
            }
        }
    }

    @Test
    public void widgetLayoutsAvoidFontsAndAppThemeAttributes() throws IOException {
        for (String layout : widgetLayouts()) {
            String xml = readLayout(layout);
            assertFalse(layout + " uses a font resource; widgets must use system fonts", xml.contains("@font/"));
            assertFalse(layout + " uses an app theme attribute the launcher cannot resolve",
                    xml.replace("?android:attr/", "").contains("?"));
        }
    }

    @Test
    public void everyViewTheProviderUpdatesExistsInAWidgetLayout() throws IOException {
        StringBuilder layouts = new StringBuilder();
        for (String layout : widgetLayouts()) {
            layouts.append(read(RES.resolve("layout").resolve(layout + ".xml")));
        }
        Matcher ids = Pattern.compile("R\\.id\\.(\\w+)").matcher(read(PROVIDER));
        while (ids.find()) {
            assertTrue("Widget layouts have no @+id/" + ids.group(1),
                    layouts.indexOf("@+id/" + ids.group(1) + "\"") >= 0);
        }
    }
}

package com.sakuin.app;

import android.graphics.*;
import android.graphics.drawable.Drawable;
import java.util.Locale;

/** Small outlined category symbols shared by the widget and saved-entry row. */
final class SakuCategoryIcon extends Drawable {
    private final String category;
    private final boolean income;
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private SakuCategoryIcon(String name, boolean income) { category = name.toLowerCase(Locale.ROOT); this.income = income; }
    static Drawable create(String name, boolean income) { return new SakuCategoryIcon(name, income); }
    @Override public void draw(Canvas c) {
        c.save(); c.translate(getBounds().left,getBounds().top); c.scale(getBounds().width()/32f,getBounds().height()/32f);
        p.setStyle(Paint.Style.FILL); p.setColor(Color.parseColor(income ? "#D4F5E0" : category.contains("belanja") ? "#FFD6E6" : "#FFF0C2")); c.drawCircle(16,16,15,p);
        p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(.8f); p.setColor(SakuWidgetDrawing.INK); c.drawCircle(16,16,15,p);
        p.setColor(Color.parseColor(income ? "#137A50" : "#9B4B18")); p.setStrokeWidth(1.5f); p.setStrokeCap(Paint.Cap.ROUND); p.setStrokeJoin(Paint.Join.ROUND);
        if (category.contains("makan") || category.contains("minum")) {
            c.drawLine(9,8,9,14,p); c.drawLine(12,8,12,24,p); c.drawLine(15,8,15,14,p); c.drawLine(9,14,15,14,p);
            c.drawLine(22,8,22,24,p); c.drawLine(19,8,19,17,p); c.drawLine(19,17,22,17,p);
        } else if (category.contains("belanja")) {
            c.drawRoundRect(10,12,23,24,2,2,p); c.drawArc(13,7,20,17,180,180,false,p);
        } else if (income) {
            c.drawRoundRect(8,10,24,23,2,2,p); c.drawLine(16,13,16,20,p); c.drawLine(12.5f,16.5f,19.5f,16.5f,p);
        } else {
            // A receipt for uncategorised spending, never a meaningless dot.
            c.drawRoundRect(10,7,22,25,2,2,p); c.drawLine(13,12,19,12,p); c.drawLine(13,16,19,16,p); c.drawLine(13,20,17,20,p);
        }
        c.restore();
    }
    @Override public void setAlpha(int alpha) { p.setAlpha(alpha); }
    @Override public void setColorFilter(ColorFilter filter) { p.setColorFilter(filter); }
    @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
}

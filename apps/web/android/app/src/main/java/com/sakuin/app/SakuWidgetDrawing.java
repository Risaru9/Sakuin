package com.sakuin.app;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;
import androidx.core.content.res.ResourcesCompat;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Draw the approved 360dp sticker design with the app's fonts, never launcher font resources. */
final class SakuWidgetDrawing {
    static final int INK = Color.rgb(29, 26, 51), CREAM = Color.rgb(255, 247, 232);
    static final int COIN = Color.rgb(255, 200, 61), MUTED = Color.rgb(98, 93, 120);
    final Bitmap bitmap;
    final RectF quick = new RectF(), refresh = new RectF();
    final String description;
    private final Context context;
    private final Canvas canvas;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Typeface head, body;
    private final float scale, width, height;

    SakuWidgetDrawing(Context c, float w, float h, boolean large, boolean login, JSONObject data, long at, float pixelsPerDp) {
        context = c;
        scale = Math.min(w / 360f, h / (large ? 268f : 164f));
        width = w / scale; height = h / scale;
        bitmap = Bitmap.createBitmap(Math.max(1, Math.round(w * pixelsPerDp)), Math.max(1, Math.round(h * pixelsPerDp)), Bitmap.Config.ARGB_8888);
        canvas = new Canvas(bitmap); canvas.scale(bitmap.getWidth() / width, bitmap.getHeight() / height);
        head = ResourcesCompat.getFont(c, R.font.fredoka_semibold);
        body = ResourcesCompat.getFont(c, R.font.nunito_extrabold);
        box(new RectF(4, 4, width, height), 26, INK, 0);
        box(new RectF(1.25f, 1.25f, width - 5.25f, height - 5.25f), 26, CREAM, 2.5f);
        if (login || data == null) {
            // Centre the message on wide cards instead of leaving the right half empty.
            float y = (height - 118) / 2, x = Math.max(0, (width - 360) / 2), textWidth = Math.min(width - 126, 234);
            mascot(R.drawable.saku_wow, x + 22, y + 24, 66);
            text(login ? "Masuk dulu, ya" : "Belum ada data", x + 104, y + 8, textWidth, 20, INK, true);
            text(login ? "Widget tampil setelah kamu masuk di" : "Sambungkan internet untuk memuat", x + 104, y + 36, textWidth, 12, MUTED, false);
            text(login ? "aplikasi." : "catatanmu.", x + 104, y + 54, textWidth, 12, MUTED, false);
            quick.set(x + 104, y + 80, x + 230, y + 122);
            button(quick, login ? "Buka Sakuin" : "+ Catat", 16);
            description = login ? "Masuk dulu, ya. Widget tampil setelah kamu masuk di aplikasi." : "Belum ada data. Sambungkan internet untuk memuat catatan.";
        } else {
            JSONObject month = data.optJSONObject("month"), budget = data.optJSONObject("budget"), top = data.optJSONObject("topCategory");
            String today = SakuStore.number(data.optDouble("todayExpense"));
            String left = SakuStore.number(month == null ? 0 : month.optDouble("left"));
            String status = budget == null ? "ok" : budget.optString("status", "ok");
            String category = budget != null ? budget.optString("categoryName") : top == null ? "" : top.optString("categoryName");
            int percent = budget == null ? 0 : budget.optInt("percent");
            String line = budget != null ? category + ("over".equals(status) ? " lewat batas" : ("ok".equals(status) ? " baru " : " ") + percent + "% dari batas")
                    : top == null ? "Belum ada pengeluaran bulan ini" : "Terbanyak: " + category;
            int color = "over".equals(status) ? Color.rgb(198,40,40) : "watch".equals(status) ? Color.rgb(138,90,0) : MUTED;
            int mood = "over".equals(status) ? R.drawable.saku_worried : "watch".equals(status) ? R.drawable.saku_wow : R.drawable.saku_happy;
            if (large) {
                String label = month == null ? "Sakuin" : month.optString("label");
                float labelWidth = text(label, 18, 20, 135, 18, INK, true);
                text(at == 0 ? "" : "diperbarui " + new SimpleDateFormat("HH.mm", Locale.US).format(new Date(at)), 26 + labelWidth, 25, width - labelWidth - 92, 10, MUTED, false);
                refresh.set(width - 52, 14, width - 20, 46);
                box(refresh, 16, Color.WHITE, 1);
                paint.setColor(INK); paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.7f);
                canvas.drawArc(refresh.left+9, refresh.top+9, refresh.right-9, refresh.bottom-9, 35, 285, false, paint);
                canvas.drawLine(refresh.right-8,refresh.top+10,refresh.right-8,refresh.top+16,paint);
                canvas.drawLine(refresh.right-8,refresh.top+16,refresh.right-14,refresh.top+16,paint);
                float statsTop = Math.max(0, height - 268) * .3f;
                mascot(mood, 18, statsTop + 56, 60);
                float statWidth = (width - 102) / 2;
                text("Keluar hari ini", 88, statsTop + 60, statWidth - 8, 12, MUTED, false);
                text(today, 88, statsTop + 76, statWidth - 8, 25, INK, true);
                text("Sisa bulan ini", 88 + statWidth, statsTop + 60, statWidth - 8, 12, MUTED, false);
                text(left, 88 + statWidth, statsTop + 76, statWidth - 12, 24, INK, true);
                // Bottom-anchored: box, last entry and button keep fixed gaps; taller cards add room above.
                float by = height - 144;
                box(new RectF(18, by, width - 20, by + 50), 18, Color.WHITE, 2);
                category(category, 31, by + 13, 24);
                text(line, 64, by + 9, width - 98, 12, color, false);
                if (budget != null) bar(64, by + 30, width - 98, percent, status);
                else text(top == null ? "" : SakuStore.number(top.optDouble("amount")), 64, by + 28, width - 98, 12, INK, false);
                JSONObject last = data.optJSONObject("lastTransaction");
                String lastLine = last == null ? "Belum ada catatan" : "Terakhir: " + last.optString("name") + ("INCOME".equals(last.optString("type")) ? " +" : " −") + SakuStore.number(last.optDouble("amount"));
                text(lastLine, 20, height - 86, width - 40, 12, MUTED, false);
                quick.set(18, height - 62, width - 20, height - 18); button(quick, "+ Catat", 18);
            } else {
                // Taller-than-designed cards share the spare height, instead of one big gap in the middle.
                float extra = Math.max(0, height - 164), down = extra * .3f, up = height - extra * .3f;
                text("Keluar hari ini", 18, down + 15, width - 110, 12, MUTED, false);
                text(today, 18, down + 30, width - 110, 30, INK, true);
                text("Sisa bulan ini " + left, 18, down + 66, width - 110, 12, INK, false);
                mascot(mood, width - 80, down + 14, 58);
                quick.set(width - 122, up - 60, width - 20, up - 18); button(quick, "+ Catat", 18);
                category(category, 18, up - 42, 22);
                text(line, 48, up - 45, width - 186, 11, color, false);
                if (budget != null) bar(48, up - 27, width - 186, percent, status);
                else text(top == null ? "" : SakuStore.number(top.optDouble("amount")), 48, up - 28, width - 186, 11, MUTED, false);
            }
            description = "Keluar hari ini " + today + ". Sisa bulan ini " + left + ". " + line;
        }
        quick.left *= scale; quick.top *= scale; quick.right *= scale; quick.bottom *= scale;
        refresh.left *= scale; refresh.top *= scale; refresh.right *= scale; refresh.bottom *= scale;
    }

    private void box(RectF r, float radius, int color, float stroke) {
        paint.setStyle(Paint.Style.FILL); paint.setColor(color); canvas.drawRoundRect(r,radius,radius,paint);
        if (stroke > 0) { paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(stroke); paint.setColor(INK); canvas.drawRoundRect(r,radius,radius,paint); }
        paint.setStyle(Paint.Style.FILL);
    }
    private float text(String value, float x, float y, float available, float size, int color, boolean heading) {
        paint.setStyle(Paint.Style.FILL); paint.setTypeface(heading ? head : body); paint.setTextSize(size); paint.setColor(color);
        // Keep amounts complete, shrink long labels only modestly and ellipsize if still necessary.
        float minimum = heading ? size * .58f : size * .9f;
        while (paint.measureText(value) > available && paint.getTextSize() > minimum) paint.setTextSize(paint.getTextSize() - .25f);
        if (paint.measureText(value) > available) { while (!value.isEmpty() && paint.measureText(value + "…") > available) value = value.substring(0, value.length()-1); value += "…"; }
        canvas.drawText(value, x, y - paint.ascent(), paint); return paint.measureText(value);
    }
    private void button(RectF r, String label, float size) {
        RectF shadow = new RectF(r); shadow.offset(2,2); box(shadow,24,INK,0); box(r,24,COIN,2);
        paint.setTypeface(head); paint.setTextSize(size);
        float tx = r.centerX() - paint.measureText(label) / 2;
        text(label, tx, r.centerY() - (paint.descent()-paint.ascent())/2, r.width()-12,size,INK,true);
    }
    private void mascot(int res, float x, float y, float size) {
        Drawable d = ResourcesCompat.getDrawable(context.getResources(),res,context.getTheme());
        if (d != null) { d.setBounds((int)x,(int)y,(int)(x+size),(int)(y+size)); d.draw(canvas); }
    }
    private void category(String name, float x, float y, float size) {
        Drawable d = SakuCategoryIcon.create(name, false); d.setBounds((int)x,(int)y,(int)(x+size),(int)(y+size)); d.draw(canvas);
    }
    private void bar(float x, float y, float w, int percent, String status) {
        RectF r = new RectF(x,y,x+w,y+8);
        box(r,4,Color.rgb(243,232,210),.7f);
        canvas.save(); Path clip = new Path(); clip.addRoundRect(r,4,4,Path.Direction.CW); canvas.clipPath(clip);
        paint.setColor("over".equals(status) ? Color.rgb(255,107,91) : "watch".equals(status) ? COIN : Color.rgb(43,99,224));
        canvas.drawRect(x,y,x+w*Math.max(0,Math.min(100,percent))/100f,y+8,paint); canvas.restore();
    }
}

package com.sakuin.app;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.view.inputmethod.EditorInfo;
import android.content.Context;
import android.widget.*;
import android.text.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.res.ResourcesCompat;
import org.json.*;

public class QuickEntryActivity extends AppCompatActivity {
    private EditText input;
    private TextView save, hint, footer, budget;
    private LinearLayout rows;
    private ProgressBar budgetBar;
    private boolean saving;
    private Typeface body, heading;
    private String entryOwner;
    private int dp(float n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size, boolean head) {
        TextView v = new TextView(this); v.setText(value); v.setTextSize(size);
        v.setTextColor(Color.parseColor("#1D1A33")); v.setTypeface(head ? heading : body); return v;
    }
    private LinearLayout vertical() { LinearLayout l = new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); return l; }
    private LinearLayout horizontal() { LinearLayout l = new LinearLayout(this); l.setGravity(Gravity.CENTER_VERTICAL); return l; }
    private void pad(View v, int n) { v.setPadding(dp(n), dp(n), dp(n), dp(n)); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        entryOwner = SakuStore.owner(SakuStore.prefs(this).getString("jwt_token", ""));
        body = ResourcesCompat.getFont(this, R.font.nunito_extrabold);
        heading = ResourcesCompat.getFont(this, R.font.fredoka_semibold);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
        FrameLayout root = new FrameLayout(this); root.setOnClickListener(v -> finish());
        LinearLayout sheet = vertical(); sheet.setBackgroundResource(R.drawable.saku_card); pad(sheet, 16); sheet.setOnClickListener(v -> {});
        FrameLayout.LayoutParams bottom = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        bottom.setMargins(dp(8), dp(8), dp(8), dp(8)); root.addView(sheet, bottom);
        LinearLayout title = horizontal(); title.addView(text("Catat cepat", 20, true), new LinearLayout.LayoutParams(0, -2, 1));
        TextView close = text("×", 26, false); close.setContentDescription("Tutup"); close.setGravity(Gravity.CENTER); close.setBackgroundResource(R.drawable.saku_white);
        title.addView(close, new LinearLayout.LayoutParams(dp(40), dp(40))); close.setOnClickListener(v -> finish()); sheet.addView(title);
        rows = vertical(); sheet.addView(rows);
        budget = text("", 12, false); budget.setTextColor(Color.parseColor("#8A5A00")); budget.setVisibility(View.GONE); pad(budget, 8); sheet.addView(budget);
        budgetBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        budgetBar.setMax(100); budgetBar.setVisibility(View.GONE); sheet.addView(budgetBar, new LinearLayout.LayoutParams(-1, dp(8)));
        LinearLayout pill = horizontal(); pill.setBackgroundResource(R.drawable.saku_input); pill.setPadding(dp(8), dp(4), dp(8), dp(6));
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(-1, dp(58)); pp.topMargin = dp(10); sheet.addView(pill, pp);
        ImageView avatar = new ImageView(this); avatar.setImageResource(R.drawable.ic_launcher_saku); avatar.setBackgroundResource(R.drawable.saku_button); pill.addView(avatar, new LinearLayout.LayoutParams(dp(42), dp(42)));
        input = new EditText(this); input.setSingleLine(true); input.setTextSize(15); input.setTypeface(body); input.setTextColor(Color.parseColor("#1D1A33")); input.setHintTextColor(Color.parseColor("#625D78"));
        input.setBackgroundColor(Color.TRANSPARENT); input.setHint("Catat… misal kopi 18rb"); input.setImeOptions(EditorInfo.IME_ACTION_DONE);
        pill.addView(input, new LinearLayout.LayoutParams(0, -1, 1));
        save = text("Simpan", 14, true); pad(save, 8); save.setBackgroundResource(R.drawable.saku_button); save.setVisibility(View.GONE); pill.addView(save);
        save.setOnClickListener(v -> save()); input.setOnEditorActionListener((v, action, event) -> {
            if (action == EditorInfo.IME_ACTION_DONE || (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN)) { save(); return true; } return false;
        });
        input.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            public void onTextChanged(CharSequence s, int start, int before, int count) { save.setVisibility(s.toString().trim().isEmpty() ? View.GONE : View.VISIBLE); }
            public void afterTextChanged(Editable e) { }
        });
        hint = text("Tekan Enter untuk simpan. Kategorinya Saku tebak sendiri.", 12, false); pad(hint, 5); hint.setTextColor(Color.parseColor("#625D78")); sheet.addView(hint);
        LinearLayout foot = horizontal(); footer = text("", 12, false); foot.addView(footer, new LinearLayout.LayoutParams(0, -2, 1));
        TextView open = text("Buka Sakuin ›", 13, false); open.setTextColor(Color.parseColor("#2B63E0")); pad(open, 6); open.setOnClickListener(v -> openApp(null)); foot.addView(open); sheet.addView(foot);
        setContentView(root);
        try { JSONObject cached = new JSONObject(SakuStore.prefs(this).getString("glance", "")); footer.setText("Hari ini keluar " + SakuStore.number(cached.optDouble("todayExpense"))); } catch (Exception ignored) { }
        if (!SakuStore.loggedIn(this) || SakuStore.prefs(this).getBoolean("auth_expired", false)) { requireLogin(); return; }
        if (state != null) input.setText(state.getString("draft", ""));
        input.requestFocus(); input.postDelayed(() -> ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE)).showSoftInput(input, InputMethodManager.SHOW_IMPLICIT), 200);
    }
    @Override protected void onSaveInstanceState(Bundle state) { state.putString("draft", input.getText().toString()); super.onSaveInstanceState(state); }
    private void requireLogin() { hint.setText("Masuk dulu, ya. Buka Sakuin untuk masuk lagi."); input.setEnabled(false); save.setVisibility(View.GONE); }
    private void openApp(String route) {
        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (route != null) intent.putExtra("saku_route", route);
        startActivity(intent); finish();
    }
    private void save() {
        String raw = input.getText().toString().trim(); if (saving || raw.isEmpty()) return;
        if (!entryOwner.equals(SakuStore.owner(SakuStore.prefs(this).getString("jwt_token", "")))) { requireLogin(); return; }
        saving = true; save.setEnabled(false); input.setEnabled(false); hint.setText("Menyimpan…");
        final JSONObject entry;
        try { entry = SakuStore.entry(raw); } catch (Exception e) { saving = false; input.setEnabled(true); save.setEnabled(true); return; }
        final Context app = getApplicationContext();
        final String queueKey = SakuStore.queueKey(app);
        SakuStore.IO.execute(() -> {
            if (!entryOwner.equals(SakuStore.owner(SakuStore.prefs(app).getString("jwt_token", "")))) {
                runOnUiThread(() -> { saving = false; requireLogin(); }); return;
            }
            SakuStore.flush(app);
            SakuStore.Reply reply = null;
            boolean pending = false;
            try {
                if (SakuStore.queue(app).length() > 0) { SakuStore.enqueue(app, queueKey, entry); pending = true; }
                else {
                    reply = SakuStore.request(app, "/api/transactions/quick", entry);
                    if (reply.code >= 500 || reply.code == 429) { SakuStore.enqueue(app, queueKey, entry); pending = true; }
                }
            } catch (Exception e) { SakuStore.enqueue(app, queueKey, entry); pending = true; }
            if (reply != null && reply.code == 201) SakuNotifications.budget(app, reply.data().optJSONArray("budgetAlerts"));
            final SakuStore.Reply result = reply; final boolean queued = pending;
            if (queued || (result != null && result.code == 201)) SakuStore.refreshWidgets(app);
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) return;
                saving = false; save.setEnabled(true); input.setEnabled(true);
                if (queued) {
                    addRow(raw, "Disimpan di HP dulu, nanti dikirim otomatis", "", null, false);
                    input.setText(""); input.setHint("Catat lagi…"); hint.setText("Disimpan di HP dulu, nanti dikirim otomatis");
                } else if (result != null && result.code == 201) {
                    JSONObject data = result.data(); JSONArray items = data.optJSONArray("transactions");
                    if (items != null) for (int i = 0; i < items.length(); i++) {
                        JSONObject tx = items.optJSONObject(i); if (tx == null) continue;
                        JSONObject category = tx.optJSONObject("category"); String cat = category == null ? "Catatan" : category.optString("name");
                        String name = tx.isNull("note") ? cat : tx.optString("note", cat); boolean income = "INCOME".equals(tx.optString("type"));
                        addRow(name, cat + " · Hari ini", (income ? "+" : "−") + SakuStore.number(tx.optDouble("amount")), tx.optString("id"), income);
                    }
                    JSONArray alerts = data.optJSONArray("budgetAlerts"); JSONObject first = alerts == null ? null : alerts.optJSONObject(0);
                    budget.setVisibility(first == null ? View.GONE : View.VISIBLE);
                    budgetBar.setVisibility(first == null ? View.GONE : View.VISIBLE);
                    if (first != null) {
                        budget.setText(first.optString("title"));
                        budgetBar.setProgressDrawable(ResourcesCompat.getDrawable(getResources(), first.optInt("level") == 100 ? R.drawable.saku_progress_over : R.drawable.saku_progress_watch, getTheme()));
                        budgetBar.setProgress((int) Math.min(100, first.optDouble("spent") / Math.max(1, first.optDouble("limit")) * 100));
                    }
                    footer.setText("Hari ini keluar " + SakuStore.number(data.optDouble("todayExpense")));
                    input.setText(""); input.setHint("Catat lagi…");
                    hint.setText(data.optInt("skippedCount") > 0 ? "Ada bagian tanpa nominal yang belum dicatat." : "");
                } else if (result != null && result.code == 401) { SakuStore.prefs(app).edit().putBoolean("auth_expired", true).remove("glance").apply(); requireLogin(); }
                else { hint.setText(result == null ? "Belum tersimpan. Coba lagi." : result.json.optString("message", "Belum tersimpan. Coba lagi.")); }
                input.requestFocus();
            });
        });
    }
    private void addRow(String name, String category, String amount, String id, boolean income) {
        LinearLayout row = horizontal(); row.setBackgroundResource(R.drawable.saku_saved); pad(row, 10);
        TextView dot = text("●", 18, false); dot.setTextColor(Color.parseColor(income ? "#137A50" : "#C77930")); pad(dot, 4); row.addView(dot);
        LinearLayout labels = vertical();
        LinearLayout top = horizontal();
        TextView nameView = text(name, 15, true); nameView.setMaxLines(1); nameView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        top.addView(nameView, new LinearLayout.LayoutParams(0, -2, 1));
        TextView chip = text(id == null ? "Nanti dikirim" : "Baru!", 9, false); chip.setBackgroundResource(R.drawable.saku_button); chip.setPadding(dp(5), dp(1), dp(5), dp(3)); top.addView(chip);
        labels.addView(top); labels.addView(text(category, 11, false)); row.addView(labels, new LinearLayout.LayoutParams(0, -2, 1));
        TextView value = text(amount, 16, true); if (income) value.setTextColor(Color.parseColor("#137A50")); row.addView(value);
        if (id != null && !id.isEmpty()) { TextView edit = text("Ubah", 12, false); pad(edit, 8); edit.setTextColor(Color.parseColor("#2B63E0")); row.addView(edit); edit.setOnClickListener(v -> openApp("/dashboard?ubah=" + android.net.Uri.encode(id))); }
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2); p.topMargin = dp(8); rows.addView(row, p);
        while (rows.getChildCount() > 2) rows.removeViewAt(0);
    }
}

package com.sakuin.app;

public class SakuinFinanceWidgetExtraProvider extends SakuinFinanceWidgetProvider {
    @Override
    protected int getLayoutResource() {
        return R.layout.sakuin_finance_widget_extra;
    }

    @Override
    protected Class<?> getProviderClass() {
        return SakuinFinanceWidgetExtraProvider.class;
    }

    @Override
    protected WidgetSize getFixedWidgetSize() {
        return WidgetSize.EXTRA_LARGE;
    }
}

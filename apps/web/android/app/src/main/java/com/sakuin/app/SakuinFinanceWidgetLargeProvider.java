package com.sakuin.app;

public class SakuinFinanceWidgetLargeProvider extends SakuinFinanceWidgetProvider {
    @Override
    protected int getLayoutResource() {
        return R.layout.sakuin_finance_widget_large;
    }

    @Override
    protected Class<?> getProviderClass() {
        return SakuinFinanceWidgetLargeProvider.class;
    }

    @Override
    protected WidgetSize getFixedWidgetSize() {
        return WidgetSize.LARGE;
    }
}

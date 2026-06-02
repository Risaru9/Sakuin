package com.sakuin.app;

public class SakuinFinanceWidgetSmallProvider extends SakuinFinanceWidgetProvider {
    @Override
    protected int getLayoutResource() {
        return R.layout.sakuin_finance_widget_small;
    }

    @Override
    protected Class<?> getProviderClass() {
        return SakuinFinanceWidgetSmallProvider.class;
    }

    @Override
    protected WidgetSize getFixedWidgetSize() {
        return WidgetSize.SMALL;
    }
}

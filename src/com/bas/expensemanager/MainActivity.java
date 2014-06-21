package com.bas.expensemanager;
import org.apache.cordova.DroidGap;

import android.os.Bundle;
public class MainActivity  extends DroidGap {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		super.setIntegerProperty("splashscreen", R.drawable.coin);
		super.loadUrl("file:///android_asset/www/index.html",3000);
	}
}

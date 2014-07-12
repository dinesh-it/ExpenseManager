package com.bas.expensemanager;
import org.apache.cordova.DroidGap;

import android.os.Bundle;
import android.view.Window;
public class MainActivity  extends DroidGap {

	@Override
	public void onCreate(Bundle savedInstanceState) {		
		//getWindow().setFeatureInt(Window.FEATURE_CUSTOM_TITLE,R.layout.abc_action_bar_title_item);
		super.setIntegerProperty("splashscreen", R.drawable.coin);
		super.setBooleanProperty("showTitle", true);
		super.onCreate(savedInstanceState);
		super.loadUrl("file:///android_asset/www/index.html",3000);
	}
}

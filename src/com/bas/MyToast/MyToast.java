package com.bas.MyToast;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;
import android.app.Activity;
import android.content.Intent;
import android.widget.Toast;

public class MyToast extends CordovaPlugin {
	public static final String ACTION_SHOW_TOAST_MSG = "showToastMsg";
	//private static final String msg = "Toast Plugin Log : ";
	@Override
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
		try {
		    if (ACTION_SHOW_TOAST_MSG.equals(action)) { 
		    JSONObject arg_object = args.getJSONObject(0);
		    String msg = arg_object.getString("MSG");
		    int duration = arg_object.getInt("DURATION");
		      //Log.i(msg,"TOAST MESSAGE SHOWING ! "+ msg);
		    Toast.makeText(this.cordova.getActivity().getApplicationContext(),msg,duration).show();
		       callbackContext.success();
		       return true;
		    }
		    callbackContext.error("Invalid action");
		    return false;
		} catch(Exception e) {
		    System.err.println("Exception: " + e.getMessage());
		    callbackContext.error(e.getMessage());
		    return false;
		} 
	 
	}
	}


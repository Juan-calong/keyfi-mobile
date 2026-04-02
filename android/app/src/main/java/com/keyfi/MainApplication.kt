package com.keyfi.app

import android.app.Application
import co.ab180.airbridge.reactnative.AirbridgeReactNative
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // add(...) se precisar de pacote manual
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    AirbridgeReactNative.initializeSDK(
      this,
      "keyfi",
      "7be3f0e664b745799d9134d9408be4c7"
    )

    loadReactNative(this)
  }
}
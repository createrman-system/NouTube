import { ConfigPlugin, withGradleProperties } from '@expo/config-plugins'
import { withAndroidManifest, withAppBuildGradle } from '@expo/config-plugins/build/plugins/android-plugins.js'

const withAndroidSigningConfig: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (config: any) => {
    const app = config.modResults.manifest.application?.[0]
    if (app) {
      app.$['android:extractNativeLibs'] = 'true'
      app.$['android:hardwareAccelerated'] = 'true'
      app.$['android:largeHeap'] = 'true'
    }

    if (!config.modResults.manifest['uses-feature']) {
      config.modResults.manifest['uses-feature'] = []
    }
    // Add Wear OS feature support
    config.modResults.manifest['uses-feature'].push({
      $: {
        'android:name': 'android.hardware.type.watch',
        'android:required': 'false',
      },
    })

    // Galaxy Watch 8 optimization: Ensure it knows about the screen shape if possible
    // (Though Wear OS handles this mostly, some hints help)
    return config
  })

  // Bump JVM memory: release builds run out of the default 512m Metaspace on
  // CI, failing :app:packageRelease. See workflow run 27182763983.
  config = withGradleProperties(config, (config) => {
    const value = '-Xmx4g -XX:MaxMetaspaceSize=2g'
    const existing = config.modResults.find(
      (item): item is { type: 'property'; key: string; value: string } =>
        item.type === 'property' && item.key === 'org.gradle.jvmargs',
    )
    if (existing) {
      existing.value = value
    } else {
      config.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value })
    }
    return config
  })

  return withAppBuildGradle(config, (config) => {
    // https://www.reddit.com/r/expo/comments/1j4v323/comment/mit9b2a/
    config.modResults.contents = config.modResults.contents
      .replace(
        'android {',
        `ext.abiCodes = [x86:1, x86_64:2, 'armeabi-v7a':3, 'arm64-v8a': 4]

android {`,
      )
      .replace('zh-Hans', 'b+zh+Hans')
      .replace('zh-Hant', 'b+zh+Hant')
      .replace('pt-BR', 'b+pt+BR')
      .replace(
        /buildTypes \{([\s\S]*?)release \{/,
        `buildTypes {$1release {
            signingConfig signingConfigs.debug`,
      )
      .replace(
        /androidResources \{([\s\S]*?)}/,
        `androidResources {$1}
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
    packagingOptions {
        pickFirst 'lib/**/libc++_shared.so'
        pickFirst 'lib/**/libfbjni.so'
        pickFirst 'lib/**/libjscexecutor.so'
        pickFirst 'lib/**/libhermes.so'
        pickFirst 'lib/**/libnative-filters.so'

        // Stability for Galaxy Watch 8 (Wear OS)
        doNotStrip "*/arm64-v8a/*.so"
        doNotStrip "*/armeabi-v7a/*.so"
    }
    splits {
        abi {
            reset()
            enable true
            universalApk true
            include 'arm64-v8a', 'armeabi-v7a'
        }
    }
    android.applicationVariants.configureEach { variant ->
        variant.outputs.each { output ->
            def baseAbiVersionCode = project.ext.abiCodes.get(output.getFilter(com.android.build.OutputFile.ABI))
            if (baseAbiVersionCode != null) {
                output.versionCodeOverride = (100 * project.android.defaultConfig.versionCode) + baseAbiVersionCode
            }
        }
    }`,
      )

    return config
  })
}

export default withAndroidSigningConfig

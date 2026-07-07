// https://github.com/ai/nanoid#react-native
import 'react-native-get-random-values'
import { nanoid } from 'nanoid'
import { ReactNode } from 'react'
import { Platform, Dimensions } from 'react-native'

export const isWeb = typeof document != 'undefined'
export const isIos = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'

const { width, height } = Dimensions.get('window')
// Galaxy Watch 8 44mm: 480x480 physical, approx 240x240 logical.
// We target devices with logical dimensions under 300px.
export const isWatch = isAndroid && width > 0 && width < 300 && height > 0 && height < 300

export const clsx = (...classes: Array<string | boolean | undefined>) => classes.filter(Boolean).join(' ')

// In react-native, writing {condition && <Cmp/>} triggers `A text node cannot be a child of a <View>` warning.
export const nIf = (condition: any, node: ReactNode) => (condition ? node : null)

export function genId(size = 16) {
  return nanoid(size)
}

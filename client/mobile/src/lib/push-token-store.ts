import * as SecureStore from 'expo-secure-store'

const KEY = 'sakin.push.token.v1'

export async function savePushToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, token)
  } catch {
    // no-op
  }
}

export async function loadPushToken(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(KEY)) ?? null
  } catch {
    return null
  }
}

export async function clearPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY)
  } catch {
    // no-op
  }
}

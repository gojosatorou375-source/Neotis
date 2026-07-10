# Skill: Mobile Development (React Native & Expo)

> This file represents project-level coding preferences for cross-platform mobile application development. Apply these rules to all mobile layouts.

## Technology Stack
- **Framework:** React Native (Expo SDK)
- **Language:** TypeScript
- **Styling:** StyleSheet, Tailwind (using NativeWind)
- **Navigation:** React Navigation (Native Stack, Tabs)
- **State:** Zustand / Redux Toolkit

## Performance & Optimization
- **List Rendering:** Always use `FlatList` or `SectionList` instead of scrollable mapping views to recycle components.
- **Image Caching:** Use `expo-image` or `react-native-fast-image` to prevent slow rendering and excessive network requests.
- **Re-renders:** Wrap complex components in `React.memo` and optimize calculations using `useMemo` and `useCallback` to avoid UI thread drops (maintain 60fps).

## Styling & Layout
- **Safe Area:** Always wrap base screens in `<SafeAreaView>` or use padding from `react-native-safe-area-context` to avoid notches and hardware buttons.
- **Keyboard Handling:** Wrap input forms in `<KeyboardAvoidingView>` (configured with appropriate offsets per OS platform) to prevent inputs from being covered by the keyboard.
- **Orientation:** Lock applications to portrait orientation unless landscape layouts are explicitly requested.

## Platform Specifics
- **Platform Module:** Use `Platform.select()` to declare OS-specific behavior or styling exceptions instead of long if-else evaluations.
- **Permissions:** Request permissions (camera, library, location) asynchronously at the moment the feature is triggered, rather than globally on startup.

---

*This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant.*

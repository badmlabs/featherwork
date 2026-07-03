import { Redirect } from 'expo-router';

// Deep links like badminton-court-simulator://import or
// https://badmlabs.github.io/court/import.html have no matching route file.
// The import itself is handled by the Linking listener in BadmintonCourt,
// so just land on the main screen instead of showing "Unmatched Route".
export default function NotFound() {
  return <Redirect href="/" />;
}

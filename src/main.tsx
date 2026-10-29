import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById("root")!);

const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
const missing = REQUIRED_ENV.filter((key) => !import.meta.env[key]);

// Google Maps powers address autocomplete only. It is optional: without a key the
// address field is a plain text input. Resolves either way so the app always renders.
function loadGoogleMaps(): Promise<void> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

if (missing.length > 0) {
  // Without these the Supabase client cannot be created. Say so on screen rather
  // than leaving a blank white page.
  root.render(
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '15vh auto', padding: '0 24px', lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Care Africa is not configured yet</h1>
      <p>Create a <code>.env</code> file in the project root with these values, then restart the dev server:</p>
      <pre style={{ background: '#fff6ec', border: '1px solid #f3d9bd', borderRadius: 8, padding: 16, overflowX: 'auto' }}>
        {REQUIRED_ENV.map((key) => `${key}=${missing.includes(key) ? '' : '(set)'}`).join('\n')}
      </pre>
      <p style={{ color: '#6b7280', fontSize: 14 }}>
        Both values are in your Supabase project under Project Settings, then API.
      </p>
    </div>
  );
} else {
  // App is imported lazily so a missing config can never crash the page at startup.
  Promise.all([import('./App'), loadGoogleMaps()]).then(([{ default: App }]) => {
    root.render(<App />);
  });
}

import "./globals.css";
import "./role-dashboard.css";

export const metadata = { title: "ExpiryWatch", description: "Track documents before they expire." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

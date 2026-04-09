import "./globals.css";

export const metadata = {
  title: "Life-Log",
  description:
    "Dashboard personale locale per abitudini, spese e note gestite tramite data.json.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}

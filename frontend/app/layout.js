import "./globals.css";

export const metadata = {
  title: "Dhaka Tesla Pool",
  description: "Share a seat. Split the fare. Survive Dhaka traffic.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">🛺 Dhaka Tesla Pool</a>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

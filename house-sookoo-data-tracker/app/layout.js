export const metadata = {
  title: "House Sookoo Data Tracker",
  description: "Upload roster exports, search and filter the network, review data quality issues.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

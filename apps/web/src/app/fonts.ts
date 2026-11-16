import { Inter, Poppins } from "next/font/google";

// The two fonts of the library: Inter for normal text, Poppins for headings
// and buttons. The library names the fonts and does not download them.
// next/font downloads them when the app is built and serves them with the app.
// The two variable names must be exactly these: the font tokens of the library
// read them.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

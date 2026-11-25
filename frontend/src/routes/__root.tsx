import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Free License Plate Blur Tool for Car Photos | PlateBlur",
      },
      {
        name: "description",
        content:
          "Blur license plates in car and vehicle photos online. Preview results, try a demo, and download a JPEG. No account needed; images are processed in memory, not stored.",
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        name: "theme-color",
        content: "#fafbf8",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "PlateBlur",
      },
      {
        property: "og:title",
        content: "Free License Plate Blur Tool for Car Photos | PlateBlur",
      },
      {
        property: "og:description",
        content:
          "Blur plates in vehicle photos before sharing. Try a sample, preview the result, and download your image—without creating an account.",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: "Free License Plate Blur Tool | PlateBlur",
      },
      {
        name: "twitter:description",
        content:
          "Blur license plates in car photos before sharing. Try a demo and download your processed image.",
      },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "PlateBlur",
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Web browser",
          description:
            "A free browser-based tool for blurring license plates in car photos before sharing.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }),
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

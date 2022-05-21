import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document<{
  theme: "dark" | "light" | null;
}> {
  static async getInitialProps(ctx: any) {
    const theme = ctx.query?.theme
      ? ctx.query?.theme === "dark"
        ? "dark"
        : ctx.query?.theme === "light"
        ? "light"
        : null
      : null;

    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, theme };
  }

  render() {
    return (
      <Html className={this.props.theme || ""}>
        <Head />
        <body>
          <Main />
          <NextScript />
          <Analytics />
        </body>
      </Html>
    );
  }
}

function Analytics() {
  const gtagId = process.env.NEXT_PUBLIC_GTAG_ID;
  return gtagId ? (
    <>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
      />
      <script
        id="gtag-init"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag() {
            dataLayer.push(arguments);
          }
          gtag("js", new Date());
          gtag("config", ${JSON.stringify(gtagId)});
        `,
        }}
      />
    </>
  ) : null;
}

export default MyDocument;
